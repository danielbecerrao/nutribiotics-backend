import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { AdminMetricsQueryDto } from './dto/admin-metrics-query.dto';
import { ListAdminPrescriptionsQueryDto } from './dto/list-admin-prescriptions-query.dto';

@Roles(Role.admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('prescriptions')
  listPrescriptions(@Query() query: ListAdminPrescriptionsQueryDto) {
    return this.adminService.listPrescriptions(query);
  }

  @Get('metrics')
  getMetrics(@Query() query: AdminMetricsQueryDto) {
    return this.adminService.getMetrics(query);
  }
}
