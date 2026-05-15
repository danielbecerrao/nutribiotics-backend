import { Controller, Get, MessageEvent, Query, Sse } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiCommonErrorResponses } from '../common/swagger/api-error-responses';
import { AdminService } from './admin.service';
import { AdminMetricsQueryDto } from './dto/admin-metrics-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ListAdminPrescriptionsQueryDto } from './dto/list-admin-prescriptions-query.dto';
import { StreamAdminMetricsQueryDto } from './dto/stream-admin-metrics-query.dto';
import { from, map, switchMap, timer } from 'rxjs';

@Roles(Role.admin)
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('prescriptions')
  @ApiOperation({
    summary: 'List prescriptions across all doctors and patients.',
  })
  @ApiOkResponse({ description: 'Paginated prescription list.' })
  @ApiCommonErrorResponses()
  listPrescriptions(@Query() query: ListAdminPrescriptionsQueryDto) {
    return this.adminService.listPrescriptions(query);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Return admin prescription and directory metrics.' })
  @ApiOkResponse({ description: 'Prescription metrics summary.' })
  @ApiCommonErrorResponses()
  getMetrics(@Query() query: AdminMetricsQueryDto) {
    return this.adminService.getMetrics(query);
  }

  @Sse('metrics/stream')
  @ApiOperation({ summary: 'Stream admin metrics updates.' })
  @ApiOkResponse({ description: 'Server-sent metrics events.' })
  @ApiCommonErrorResponses()
  streamMetrics(@Query() query: StreamAdminMetricsQueryDto) {
    return timer(0, 10000).pipe(
      switchMap(() => from(this.adminService.getMetrics(query))),
      map(
        (metrics): MessageEvent => ({
          data: metrics,
          type: 'metrics',
        }),
      ),
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List audit log entries.' })
  @ApiOkResponse({ description: 'Paginated audit log list.' })
  @ApiCommonErrorResponses()
  listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}
