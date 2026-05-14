import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginatedResponse,
  getPagination,
} from '../common/helpers/pagination.helper';
import { PrismaService } from '../prisma/prisma.service';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listPatients(query: ListPatientsQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.PatientWhereInput = {};

    if (query.q) {
      const q = query.q.trim();
      if (q.length) {
        where.OR = [
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ];
      }
    }

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.patient.count({ where }),
      this.prismaService.patient.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: {
          user: {
            createdAt: 'desc',
          },
        },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return buildPaginatedResponse(data, total, pagination);
  }
}
