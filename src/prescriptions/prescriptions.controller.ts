import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListDoctorPrescriptionsQueryDto } from './dto/list-doctor-prescriptions-query.dto';
import { ListPatientPrescriptionsQueryDto } from './dto/list-patient-prescriptions-query.dto';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Roles(Role.doctor)
  @Post()
  createPrescription(
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.createPrescription(userId, body);
  }

  @Roles(Role.doctor)
  @Get()
  listDoctorPrescriptions(
    @CurrentUser('sub') userId: string,
    @Query() query: ListDoctorPrescriptionsQueryDto,
  ) {
    return this.prescriptionsService.listDoctorPrescriptions(userId, query);
  }

  @Roles(Role.doctor, Role.patient, Role.admin)
  @Get(':id/pdf')
  async downloadPrescriptionPdf(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') prescriptionId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { pdf, filename } =
      await this.prescriptionsService.getPrescriptionPdfForAuthenticatedUser(
        user,
        prescriptionId,
      );

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    return pdf;
  }

  @Roles(Role.doctor, Role.patient)
  @Get(':id')
  getDoctorPrescription(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') prescriptionId: string,
  ) {
    return this.prescriptionsService.getPrescriptionByIdForAuthenticatedUser(
      user,
      prescriptionId,
    );
  }

  @Roles(Role.patient)
  @Put(':id/consume')
  consumePrescription(
    @CurrentUser('sub') userId: string,
    @Param('id') prescriptionId: string,
  ) {
    return this.prescriptionsService.consumePrescription(
      userId,
      prescriptionId,
    );
  }
}

@Roles(Role.patient)
@Controller('me/prescriptions')
export class MePrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  listPatientPrescriptions(
    @CurrentUser('sub') userId: string,
    @Query() query: ListPatientPrescriptionsQueryDto,
  ) {
    return this.prescriptionsService.listPatientPrescriptions(userId, query);
  }
}
