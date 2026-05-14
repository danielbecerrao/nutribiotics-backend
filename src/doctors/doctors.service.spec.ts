import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from './doctors.service';

describe('DoctorsService', () => {
  let doctorsService: DoctorsService;
  const count = jest.fn();
  const findMany = jest.fn();
  const transaction = jest.fn();
  const prismaService = {
    doctor: {
      count,
      findMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction.mockImplementation((promises: Promise<unknown>[]) =>
      Promise.all(promises),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    doctorsService = module.get(DoctorsService);
  });

  it('lists doctors with pagination and search', async () => {
    const doctor = {
      id: 'doctor_1',
      userId: 'user_1',
      specialty: 'Medicina general',
      user: {
        id: 'user_1',
        email: 'dr@test.com',
        password: 'hashed',
        refreshTokenHash: null,
        name: 'Doctor Test',
        role: Role.doctor,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    };

    count.mockResolvedValue(1);
    findMany.mockResolvedValue([doctor]);

    await expect(
      doctorsService.listDoctors({ page: 3, limit: 5, q: ' general ' }),
    ).resolves.toEqual({
      data: [doctor],
      page: 3,
      limit: 5,
      total: 1,
      totalPages: 1,
    });

    const where = {
      OR: [
        { user: { email: { contains: 'general', mode: 'insensitive' } } },
        { user: { name: { contains: 'general', mode: 'insensitive' } } },
        { specialty: { contains: 'general', mode: 'insensitive' } },
      ],
    };

    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith({
      where,
      include: {
        user: true,
      },
      orderBy: {
        user: {
          createdAt: 'desc',
        },
      },
      skip: 10,
      take: 5,
    });
  });
});
