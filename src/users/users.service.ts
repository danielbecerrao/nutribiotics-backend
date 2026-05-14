import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

const PASSWORD_HASH_ROUNDS = 10;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  findById(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  findByRole(role: Role) {
    return this.prismaService.user.findMany({
      where: { role },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createUser(input: CreateUserDto) {
    const email = normalizeEmail(input.email);
    const password = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

    try {
      return await this.prismaService.user.create({
        data: {
          email,
          password,
          name: input.name,
          role: input.role,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.q) {
      const q = query.q.trim();
      if (q.length) {
        where.OR = [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
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
