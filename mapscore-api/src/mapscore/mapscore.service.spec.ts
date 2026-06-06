import { Test, TestingModule } from '@nestjs/testing';
import { MapscoreService } from './mapscore.service';

describe('MapscoreService', () => {
  let service: MapscoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MapscoreService],
    }).compile();

    service = module.get<MapscoreService>(MapscoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
