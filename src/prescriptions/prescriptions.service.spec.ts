import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Doctor, Patient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrescriptionsService } from './prescriptions.service';

describe('PrescriptionsService', () => {
  let prescriptionsService: PrescriptionsService;
  const findDoctor = jest.fn();
  const findPatient = jest.fn();
  const prismaService = {
    doctor: {
      findUnique: findDoctor,
    },
    patient: {
      findUnique: findPatient,
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    prescriptionsService = module.get(PrescriptionsService);
  });

  it('returns the doctor linked to the authenticated user', async () => {
    const doctor: Doctor = {
      id: 'doctor_1',
      userId: 'user_1',
      specialty: 'Medicina general',
    };

    findDoctor.mockResolvedValue(doctor);

    await expect(
      prescriptionsService.getDoctorFromAuthenticatedUser('user_1'),
    ).resolves.toEqual(doctor);
    expect(findDoctor).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
    });
  });

  it('rejects authenticated users without doctor profile', async () => {
    findDoctor.mockResolvedValue(null);

    await expect(
      prescriptionsService.getDoctorFromAuthenticatedUser('user_1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns an existing patient', async () => {
    const patient: Patient = {
      id: 'patient_1',
      userId: 'user_1',
      birthDate: new Date('1990-05-15T00:00:00.000Z'),
    };

    findPatient.mockResolvedValue(patient);

    await expect(
      prescriptionsService.verifyPatientExists('patient_1'),
    ).resolves.toEqual(patient);
    expect(findPatient).toHaveBeenCalledWith({
      where: { id: 'patient_1' },
    });
  });

  it('throws when patient does not exist', async () => {
    findPatient.mockResolvedValue(null);

    await expect(
      prescriptionsService.verifyPatientExists('patient_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
