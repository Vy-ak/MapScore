import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { MapscoreModule } from './mapscore/mapscore.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MapscoreModule, 
    AuthModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService
  ],
})
export class AppModule {}