import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/dto/sort-order-query.dto';

export class ListAdminPrescriptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PrescriptionStatus,
    example: PrescriptionStatus.pending,
  })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @ApiPropertyOptional({
    description: 'Doctor profile id.',
    example: 'doctor_cuid',
  })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Patient profile id.',
    example: 'patient_cuid',
  })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 start date.',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 end date.',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.desc,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order = SortOrder.desc;
}
