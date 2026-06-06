import { Module } from '@nestjs/common';
import { MapscoreService } from './mapscore.service';
import { MapscoreController } from './mapscore.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MapscoreController],
  providers: [MapscoreService, PrismaService],
})
export class MapscoreModule {}