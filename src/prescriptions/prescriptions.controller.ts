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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiCommonErrorResponses } from '../common/swagger/api-error-responses';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListDoctorPrescriptionsQueryDto } from './dto/list-doctor-prescriptions-query.dto';
import { ListPatientPrescriptionsQueryDto } from './dto/list-patient-prescriptions-query.dto';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Roles(Role.doctor)
  @Post()
  @ApiOperation({ summary: 'Create a prescription as a doctor.' })
  @ApiCreatedResponse({ description: 'Created prescription.' })
  @ApiCommonErrorResponses({ notFound: true })
  createPrescription(
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.createPrescription(userId, body);
  }

  @Roles(Role.doctor)
  @Get()
  @ApiOperation({
    summary: 'List prescriptions authored by the current doctor.',
  })
  @ApiOkResponse({ description: 'Paginated prescription list.' })
  @ApiCommonErrorResponses()
  listDoctorPrescriptions(
    @CurrentUser('sub') userId: string,
    @Query() query: ListDoctorPrescriptionsQueryDto,
  ) {
    return this.prescriptionsService.listDoctorPrescriptions(userId, query);
  }

  @Roles(Role.doctor, Role.patient, Role.admin)
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download a prescription PDF.' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Prescription PDF file.' })
  @ApiCommonErrorResponses({ notFound: true })
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
  @ApiOperation({ summary: 'Get prescription detail for an allowed user.' })
  @ApiOkResponse({ description: 'Prescription detail.' })
  @ApiCommonErrorResponses({ notFound: true })
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
  @ApiOperation({ summary: 'Mark a prescription as consumed by the patient.' })
  @ApiOkResponse({ description: 'Consumed prescription detail.' })
  @ApiCommonErrorResponses({ notFound: true, conflict: true })
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
@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('me/prescriptions')
export class MePrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List prescriptions owned by the current patient.' })
  @ApiOkResponse({ description: 'Paginated prescription list.' })
  @ApiCommonErrorResponses()
  listPatientPrescriptions(
    @CurrentUser('sub') userId: string,
    @Query() query: ListPatientPrescriptionsQueryDto,
  ) {
    return this.prescriptionsService.listPatientPrescriptions(userId, query);
  }
}
