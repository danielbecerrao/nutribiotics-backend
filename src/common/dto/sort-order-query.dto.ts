import { IsEnum, IsOptional } from 'class-validator';

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class SortOrderQueryDto {
  @IsOptional()
  @IsEnum(SortOrder)
  order = SortOrder.desc;
}
