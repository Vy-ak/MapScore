import { Controller, Post, Get, Delete, Body, Query, Param } from '@nestjs/common';
import { MapscoreService } from './mapscore.service';

@Controller('api/analyze')
export class MapscoreController {
  constructor(private readonly mapscoreService: MapscoreService) {}

  @Post('search')
  async search(@Body() body: any) {
    return this.mapscoreService.searchBusinessOptions(body.businessName, body.location);
  }

  @Post('save')
  async save(@Body() body: any) {
    return this.mapscoreService.saveAndAnalyzeBusiness(body.userId, body.businessName, body.location, body.competitorList);
  }

  @Get('my-businesses')
  async getMy(@Query('userId') userId: string) {
    const data = await this.mapscoreService.getUserBusinesses(userId);
    return { success: true, businesses: data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.mapscoreService.deleteBusiness(userId, id);
  }
}