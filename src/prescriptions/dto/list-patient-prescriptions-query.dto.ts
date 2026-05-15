import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPatientPrescriptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PrescriptionStatus,
    example: PrescriptionStatus.pending,
  })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @ApiPropertyOptional({
    description: 'Text search over prescription notes and item names.',
    example: 'vitamin',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
