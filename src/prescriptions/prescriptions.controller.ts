import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListDoctorPrescriptionsQueryDto } from './dto/list-doctor-prescriptions-query.dto';
import { PrescriptionsService } from './prescriptions.service';

@Roles(Role.doctor)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  createPrescription(
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.createPrescription(userId, body);
  }

  @Get()
  listDoctorPrescriptions(
    @CurrentUser('sub') userId: string,
    @Query() query: ListDoctorPrescriptionsQueryDto,
  ) {
    return this.prescriptionsService.listDoctorPrescriptions(userId, query);
  }

  @Get(':id')
  getDoctorPrescription(
    @CurrentUser('sub') userId: string,
    @Param('id') prescriptionId: string,
  ) {
    return this.prescriptionsService.getDoctorPrescriptionById(
      userId,
      prescriptionId,
    );
  }
}
