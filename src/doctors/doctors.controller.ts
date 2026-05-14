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
import { DoctorsService } from './doctors.service';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';

@ApiTags('Doctors')
@ApiBearerAuth()
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Roles(Role.admin)
  @Get()
  @ApiOperation({ summary: 'List doctor profiles.' })
  @ApiOkResponse({ description: 'Paginated doctor list.' })
  @ApiCommonErrorResponses()
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
