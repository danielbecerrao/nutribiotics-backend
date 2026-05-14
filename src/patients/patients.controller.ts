import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { toPublicUser } from '../users/utils/to-public-user';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Roles(Role.doctor, Role.admin)
  @Get()
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
