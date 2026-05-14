import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class DateRangeQueryDto {
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
}
