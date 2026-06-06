import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    PassportModule
  ],
  controllers: [
    AuthController
  ],
  providers: [
    GoogleStrategy,
    PrismaService
  ],
})
export class AuthModule {}