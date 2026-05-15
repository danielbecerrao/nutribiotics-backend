import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogAction } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: AuditLogAction,
    example: AuditLogAction.prescription_consumed,
  })
  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;
}
