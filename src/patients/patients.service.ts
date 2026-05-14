import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listPatients(query: ListPatientsQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
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
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
