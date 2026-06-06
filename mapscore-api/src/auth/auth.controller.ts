import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  
  /**
   * STEP 1: INISIASI LOGIN GOOGLE
   * Rute ini dipanggil saat user mengklik tombol "Continue with Google" di Frontend.
   * Endpoint: GET http://localhost:3000/auth/google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // Fungsi ini dibiarkan kosong karena Passport.js akan secara otomatis
    // mencegat request ini dan mengarahkan user ke halaman persetujuan Google.
  }

  /**
   * STEP 2: MENERIMA DATA DARI GOOGLE (CALLBACK)
   * Setelah user setuju di layar Google, Google akan melempar datanya ke rute ini.
   * Endpoint: GET http://localhost:3000/auth/google/callback
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // 1. Ambil data user yang berhasil login dari GoogleStrategy
    const user: any = req.user;

    // 2. Bawa data tersebut ke frontend menggunakan URL Query Parameters
    // Catatan: encodeURIComponent digunakan agar karakter seperti spasi pada nama atau '@' pada email aman di URL.
    const frontendUrl = `http://localhost:5173?userId=${user.id}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;
    
    // 3. Alihkan pengguna beserta datanya kembali ke aplikasi React
    return res.redirect(frontendUrl); 
  }
}