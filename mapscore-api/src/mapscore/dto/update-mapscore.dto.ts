import { PartialType } from '@nestjs/mapped-types';
import { CreateMapscoreDto } from './create-mapscore.dto';

export class UpdateMapscoreDto extends PartialType(CreateMapscoreDto) {}
