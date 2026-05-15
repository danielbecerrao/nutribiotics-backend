import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AdminMetricsQueryDto } from './admin-metrics-query.dto';

export class StreamAdminMetricsQueryDto extends AdminMetricsQueryDto {
  @ApiPropertyOptional({
    description: 'Bearer token for EventSource clients.',
  })
  @IsOptional()
  @IsString()
  access_token?: string;
}
