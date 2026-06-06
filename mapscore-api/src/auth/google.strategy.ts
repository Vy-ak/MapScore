import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { id, emails, displayName } = profile;
    const email = emails[0].value;

    // Cek apakah user sudah pernah mendaftar sebelumnya
    let user = await this.prisma.user.findUnique({ 
      where: { email: email } 
    });

    // Jika belum ada, buat user baru di database
    if (!user) {
      user = await this.prisma.user.create({
        data: { 
          googleId: id, 
          email: email, 
          name: displayName 
        }
      });
    }

    done(null, user);
  }
}