import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let patientsService: PatientsService;
  const count = jest.fn();
  const findMany = jest.fn();
  const transaction = jest.fn();
  const prismaService = {
    patient: {
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
        PatientsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    patientsService = module.get(PatientsService);
  });

  it('lists patients with pagination and search', async () => {
    const patient = {
      id: 'patient_1',
      userId: 'user_1',
      birthDate: new Date('1990-05-15T00:00:00.000Z'),
      user: {
        id: 'user_1',
        email: 'patient@test.com',
        password: 'hashed',
        refreshTokenHash: null,
        name: 'Patient Test',
        role: Role.patient,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    };

    count.mockResolvedValue(1);
    findMany.mockResolvedValue([patient]);

    await expect(
      patientsService.listPatients({ page: 2, limit: 10, q: ' patient ' }),
    ).resolves.toEqual({
      data: [patient],
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });

    const where = {
      OR: [
        { user: { email: { contains: 'patient', mode: 'insensitive' } } },
        { user: { name: { contains: 'patient', mode: 'insensitive' } } },
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
      take: 10,
    });
  });
});
