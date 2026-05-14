import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListDoctorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by doctor email or name.',
    maxLength: 120,
    example: 'doctor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
