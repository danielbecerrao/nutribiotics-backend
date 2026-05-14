import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginatedResponse,
  getPagination,
} from '../common/helpers/pagination.helper';
import { PrismaService } from '../prisma/prisma.service';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listDoctors(query: ListDoctorsQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.DoctorWhereInput = {};

    if (query.q) {
      const q = query.q.trim();
      if (q.length) {
        where.OR = [
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { specialty: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.doctor.count({ where }),
      this.prismaService.doctor.findMany({
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
