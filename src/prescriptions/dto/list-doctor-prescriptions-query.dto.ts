import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/dto/sort-order-query.dto';

function transformBooleanQuery(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class ListDoctorPrescriptionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Reserved flag for own prescriptions.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => transformBooleanQuery(value))
  @IsBoolean()
  mine?: boolean;

  @ApiPropertyOptional({
    enum: PrescriptionStatus,
    example: PrescriptionStatus.pending,
  })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

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

  @ApiPropertyOptional({
    description: 'Text search over prescription notes and item names.',
    example: 'vitamin',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
