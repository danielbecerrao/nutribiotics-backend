import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listDoctors(query: ListDoctorsQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
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
