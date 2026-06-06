import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    // Mendaftarkan PassportModule ke dalam modul Auth ini
    PassportModule
  ],
  controllers: [
    // Mendaftarkan controller yang menangani rute login (/auth/google)
    AuthController
  ],
  providers: [
    // Mendaftarkan strategi Google OAuth yang berisi logika login
    GoogleStrategy,
    // Mendaftarkan PrismaService karena GoogleStrategy butuh akses ke database
    // untuk mencari atau membuat akun user baru
    PrismaService
  ],
})
export class AuthModule {}