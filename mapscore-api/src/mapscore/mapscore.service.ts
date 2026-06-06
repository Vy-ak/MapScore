import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MapscoreService {
  private readonly logger = new Logger(MapscoreService.name);

  constructor(private prisma: PrismaService) {}

  private async fetchBusinessDetails(businessName: string, location: string) {
    const apiKey = process.env.BUSINESS_API_KEY || process.env.SERPAPI_KEY;
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('engine', 'google_maps');
    url.searchParams.append('q', `${businessName} ${location}`);
    url.searchParams.append('type', 'search');
    url.searchParams.append('api_key', apiKey || '');
    
    const res = await fetch(url.toString());
    const data = await res.json();
    return data.local_results?.[0] || data.place_results;
  }

  private async fetchCompetitors(category: string, location: string) {
    const apiKey = process.env.COMPETITOR_API_KEY || process.env.SERPAPI_KEY;
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('engine', 'google_maps');
    url.searchParams.append('q', `${category} di ${location}`);
    url.searchParams.append('type', 'search');
    url.searchParams.append('api_key', apiKey || '');
    
    const res = await fetch(url.toString());
    const data = await res.json();
    return data.local_results || [];
  }

  async searchBusinessOptions(businessName: string, location: string) {
    try {
      const apiKey = process.env.BUSINESS_API_KEY || process.env.SERPAPI_KEY;
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.append('engine', 'google_maps');
      url.searchParams.append('q', `${businessName} ${location}`);
      url.searchParams.append('type', 'search');
      url.searchParams.append('api_key', apiKey || '');

      const response = await fetch(url.toString());
      const data = await response.json();
      
      const localResults = data.local_results || [];
      
      if (localResults.length === 0) {
        throw new NotFoundException("Bisnis tidak ditemukan di lokasi tersebut.");
      }

      return {
        success: true,
        options: localResults.slice(0, 5).map((biz: any) => ({
          name: biz.title,
          location: biz.address || location,
          rating: biz.rating || 0,
          reviews: biz.reviews || 0,
          primaryCat: Array.isArray(biz.type) ? biz.type[0] : (biz.type || 'Bisnis Lokal')
        }))
      };
    } catch (error: any) {
      this.logger.error(`Error searchBusinessOptions: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  async saveAndAnalyzeBusiness(userId: string, businessName: string, location: string, competitorList: any[] = []) {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;

      let targetBusiness;
      if (competitorList && competitorList.length > 0) {
        targetBusiness = competitorList.find(b => b.name === businessName) || competitorList[0];
      } else {
        targetBusiness = await this.fetchBusinessDetails(businessName, location);
      }
      
      if (!targetBusiness) throw new NotFoundException("Bisnis tidak ditemukan.");

      let competitors = [];
      if (competitorList && competitorList.length >= 3) {
        competitors = competitorList.slice(0, 5).map((biz: any, index: number) => ({
          rank: index + 1,
          name: biz.name || biz.title,
          reviews: biz.reviews || 0,
          rating: biz.rating || 0,
          score: Math.min(Math.round((biz.rating || 0) * 10 + (biz.reviews || 0) / 50), 99),
        }));
      } else {
        const category = Array.isArray(targetBusiness.type) ? targetBusiness.type[0] : (targetBusiness.type || 'Bisnis Lokal');
        const pureCompetitorList = await this.fetchCompetitors(category, location);
        
        competitors = (pureCompetitorList.length > 0 ? pureCompetitorList : [targetBusiness]).slice(0, 5).map((biz: any, index: number) => ({
          rank: index + 1,
          name: biz.title || targetBusiness.title,
          reviews: biz.reviews || 0,
          rating: biz.rating || 0,
          score: Math.min(Math.round((biz.rating || 0) * 10 + (biz.reviews || 0) / 50), 99),
        }));
      }
      const genAI = new GoogleGenerativeAI(geminiApiKey || '');
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      let aiTasks: any[] = [];
      try {
        const targetName = targetBusiness.name || targetBusiness.title;
        const prompt = `Analisis SEO Lokal untuk: "${targetName}" di ${location}. Berikan 3 rekomendasi tugas teknis SEO yang sangat spesifik dan bisa langsung dieksekusi. Output WAJIB JSON array murni tanpa markdown: [{ "description": "Teks penjelasan detail", "impactScore": number (1-10) }]`;
        const result = await model.generateContent(prompt);
        aiTasks = JSON.parse(result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim());
      } catch (e) {
        this.logger.error("Gemini AI gagal, menggunakan tugas statis.", e);
        aiTasks = [
          { description: "Perbarui jam operasional Anda dan pastikan sama di seluruh platform digital.", impactScore: 9 },
          { description: "Balas minimal 3 ulasan pelanggan positif dan negatif untuk meningkatkan engagement.", impactScore: 8 },
          { description: "Tambahkan foto lokasi eksterior dan interior terbaru Anda bulan ini.", impactScore: 7 }
        ];
      }
      const safeCat = Array.isArray(targetBusiness.type) ? targetBusiness.type[0] : (targetBusiness.type || 'Bisnis Lokal');

      await this.prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: userId === 'dev-user' ? 'admin@mapscore.app' : `${userId}@test.com`,
          name: userId === 'dev-user' ? 'Developer Admin' : 'Test User',
        },
      });
      
      const business = await this.prisma.business.create({
        data: {
          userId,
          name: targetBusiness.name || targetBusiness.title,
          location: targetBusiness.location || targetBusiness.address || location,
          primaryCat: safeCat,
          totalReviews: targetBusiness.reviews || 0,
          avgRating: targetBusiness.rating || 0,
          scoreHistory: { create: { score: competitors[0]?.score || 0, rank: 1 } },
          tasks: { create: aiTasks }
        },
        include: { tasks: true, scoreHistory: true }
      });

      return { success: true, business, competitors };
    } catch (error: any) {
      this.logger.error(`Error saveAndAnalyzeBusiness: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }
  async getUserBusinesses(userId: string) {
    return this.prisma.business.findMany({
      where: { userId },
      include: { scoreHistory: { orderBy: { createdAt: 'desc' }, take: 1 }, tasks: true },
      orderBy: { createdAt: 'desc' }
    });
  }
  async deleteBusiness(userId: string, businessId: string) {
    try {
      const biz = await this.prisma.business.findFirst({ where: { id: businessId, userId } });
      if (!biz) throw new NotFoundException("Bisnis tidak ditemukan.");

      await this.prisma.task.deleteMany({ where: { businessId } });
      await this.prisma.scoreHistory.deleteMany({ where: { businessId } });
      await this.prisma.business.delete({ where: { id: businessId } });

      return { success: true, message: "Bisnis berhasil dihapus." };
    } catch (error: any) {
      this.logger.error(`Error deleteBusiness: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }
}