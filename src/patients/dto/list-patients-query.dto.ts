import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPatientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by patient email or name.',
    maxLength: 120,
    example: 'patient',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
