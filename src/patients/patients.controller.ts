import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiCommonErrorResponses } from '../common/swagger/api-error-responses';
import { toPublicUser } from '../users/utils/to-public-user';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Roles(Role.doctor, Role.admin)
  @Get()
  @ApiOperation({ summary: 'List patient profiles.' })
  @ApiOkResponse({ description: 'Paginated patient list.' })
  @ApiCommonErrorResponses()
  async listPatients(@Query() query: ListPatientsQueryDto) {
    const { data, ...meta } = await this.patientsService.listPatients(query);

    return {
      ...meta,
      data: data.map(toPublicPatient),
    };
  }
}

type PatientWithUser = Prisma.PatientGetPayload<{
  include: {
    user: true;
  };
}>;

function toPublicPatient(patient: PatientWithUser) {
  const { user, ...patientData } = patient;

  return {
    ...patientData,
    user: toPublicUser(user),
  };
}
