import { Controller, Get, Query } from '@nestjs/common';
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
import { ListAdminPrescriptionsQueryDto } from './dto/list-admin-prescriptions-query.dto';

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
}
