import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { toPublicUser } from '../users/utils/to-public-user';
import { DoctorsService } from './doctors.service';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Roles(Role.admin)
  @Get()
  async listDoctors(@Query() query: ListDoctorsQueryDto) {
    const { data, ...meta } = await this.doctorsService.listDoctors(query);

    return {
      ...meta,
      data: data.map(toPublicDoctor),
    };
  }
}

type DoctorWithUser = Prisma.DoctorGetPayload<{
  include: {
    user: true;
  };
}>;

function toPublicDoctor(doctor: DoctorWithUser) {
  const { user, ...doctorData } = doctor;

  return {
    ...doctorData,
    user: toPublicUser(user),
  };
}
