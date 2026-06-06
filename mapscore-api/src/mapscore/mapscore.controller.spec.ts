import { Test, TestingModule } from '@nestjs/testing';
import { MapscoreController } from './mapscore.controller';
import { MapscoreService } from './mapscore.service';

describe('MapscoreController', () => {
  let controller: MapscoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapscoreController],
      providers: [MapscoreService],
    }).compile();

    controller = module.get<MapscoreController>(MapscoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
