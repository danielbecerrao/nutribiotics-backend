import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Doctor,
  Patient,
  PrescriptionStatus,
  Role,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/bootstrap/configure-app';
import { PrismaService } from './../src/prisma/prisma.service';

interface AuthResponseBody {
  accessToken: string;
}

interface AdminTestData {
  adminUser: User;
  doctorUser: User;
  patientUser: User;
  doctor: Doctor;
  otherDoctor: Doctor;
  patient: Patient;
  otherPatient: Patient;
}

async function upsertUser(
  prismaService: PrismaService,
  input: {
    email: string;
    password: string;
    name: string;
    role: Role;
  },
) {
  const password = await bcrypt.hash(input.password, 10);

  return prismaService.user.upsert({
    where: { email: input.email },
    update: {
      password,
      name: input.name,
      role: input.role,
      refreshTokenHash: null,
    },
    create: {
      email: input.email,
      password,
      name: input.name,
      role: input.role,
    },
  });
}

async function prepareTestData(
  prismaService: PrismaService,
): Promise<AdminTestData> {
  const adminUser = await upsertUser(prismaService, {
    email: 'admin-dashboard@test.com',
    password: 'admin123',
    name: 'Admin Dashboard',
    role: Role.admin,
  });
  const doctorUser = await upsertUser(prismaService, {
    email: 'admin-doctor@test.com',
    password: 'doctor123',
    name: 'Admin Doctor',
    role: Role.doctor,
  });
  const otherDoctorUser = await upsertUser(prismaService, {
    email: 'admin-other-doctor@test.com',
    password: 'doctor123',
    name: 'Admin Other Doctor',
    role: Role.doctor,
  });
  const patientUser = await upsertUser(prismaService, {
    email: 'admin-patient@test.com',
    password: 'patient123',
    name: 'Admin Patient',
    role: Role.patient,
  });
  const otherPatientUser = await upsertUser(prismaService, {
    email: 'admin-other-patient@test.com',
    password: 'patient123',
    name: 'Admin Other Patient',
    role: Role.patient,
  });

  const doctor = await prismaService.doctor.upsert({
    where: { userId: doctorUser.id },
    update: { specialty: 'Nutricion clinica' },
    create: {
      userId: doctorUser.id,
      specialty: 'Nutricion clinica',
    },
  });
  const otherDoctor = await prismaService.doctor.upsert({
    where: { userId: otherDoctorUser.id },
    update: { specialty: 'Medicina funcional' },
    create: {
      userId: otherDoctorUser.id,
      specialty: 'Medicina funcional',
    },
  });
  const patient = await prismaService.patient.upsert({
    where: { userId: patientUser.id },
    update: { birthDate: new Date('1991-04-10T00:00:00.000Z') },
    create: {
      userId: patientUser.id,
      birthDate: new Date('1991-04-10T00:00:00.000Z'),
    },
  });
  const otherPatient = await prismaService.patient.upsert({
    where: { userId: otherPatientUser.id },
    update: { birthDate: new Date('1993-09-25T00:00:00.000Z') },
    create: {
      userId: otherPatientUser.id,
      birthDate: new Date('1993-09-25T00:00:00.000Z'),
    },
  });

  return {
    adminUser,
    doctorUser,
    patientUser,
    doctor,
    otherDoctor,
    patient,
    otherPatient,
  };
}

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let testData: AdminTestData;

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    const body = response.body as AuthResponseBody;

    return body.accessToken;
  }

  function createPrescription(input: {
    code: string;
    status: PrescriptionStatus;
    createdAt: Date;
    doctorId?: string;
    patientId?: string;
  }) {
    return prismaService.prescription.create({
      data: {
        code: input.code,
        status: input.status,
        notes: 'e2e: admin metrics',
        createdAt: input.createdAt,
        consumedAt:
          input.status === PrescriptionStatus.consumed
            ? new Date(input.createdAt.getTime() + 60 * 60 * 1000)
            : null,
        authorId: input.doctorId ?? testData.doctor.id,
        patientId: input.patientId ?? testData.patient.id,
        items: {
          create: [
            {
              name: 'Admin test item',
            },
          ],
        },
      },
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
    prismaService = app.get(PrismaService);
    testData = await prepareTestData(prismaService);
  });

  beforeEach(async () => {
    await prismaService.prescription.deleteMany({
      where: {
        notes: {
          startsWith: 'e2e: admin',
        },
      },
    });
  });

  it('/admin/prescriptions (GET) allows admin and applies filters', async () => {
    const token = await login(testData.adminUser.email, 'admin123');
    const includedPrescription = await createPrescription({
      code: `RX-ADMIN-${Date.now()}-A`,
      status: PrescriptionStatus.pending,
      createdAt: new Date('2035-01-01T10:00:00.000Z'),
    });
    await createPrescription({
      code: `RX-ADMIN-${Date.now()}-B`,
      status: PrescriptionStatus.consumed,
      createdAt: new Date('2035-01-01T12:00:00.000Z'),
      doctorId: testData.otherDoctor.id,
    });
    await createPrescription({
      code: `RX-ADMIN-${Date.now()}-C`,
      status: PrescriptionStatus.pending,
      createdAt: new Date('2035-01-02T10:00:00.000Z'),
      patientId: testData.otherPatient.id,
    });

    const response = await request(app.getHttpServer())
      .get(
        `/admin/prescriptions?status=pending&doctorId=${testData.doctor.id}` +
          `&patientId=${testData.patient.id}` +
          '&from=2035-01-01T00:00:00.000Z&to=2035-01-01T23:59:59.999Z' +
          '&page=1&limit=10',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = response.body as {
      data: Array<{
        id: string;
        status: PrescriptionStatus;
        authorId: string;
        patientId: string;
        patient: { user: { password?: unknown; refreshTokenHash?: unknown } };
        author: { user: { password?: unknown; refreshTokenHash?: unknown } };
      }>;
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };

    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(body.total).toBe(1);
    expect(body.totalPages).toBe(1);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: includedPrescription.id,
      status: PrescriptionStatus.pending,
      authorId: testData.doctor.id,
      patientId: testData.patient.id,
    });
    expect(body.data[0].patient.user.password).toBeUndefined();
    expect(body.data[0].patient.user.refreshTokenHash).toBeUndefined();
    expect(body.data[0].author.user.password).toBeUndefined();
    expect(body.data[0].author.user.refreshTokenHash).toBeUndefined();
  });

  it('/admin routes reject non-admin users', async () => {
    const doctorToken = await login(testData.doctorUser.email, 'doctor123');
    const patientToken = await login(testData.patientUser.email, 'patient123');

    await request(app.getHttpServer())
      .get('/admin/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(403)
      .expect({
        message: 'Forbidden resource',
        code: 'FORBIDDEN',
        details: {},
      });
    await request(app.getHttpServer())
      .get('/admin/metrics')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403)
      .expect({
        message: 'Forbidden resource',
        code: 'FORBIDDEN',
        details: {},
      });
  });

  it('/admin/metrics (GET) returns controlled metrics', async () => {
    const token = await login(testData.adminUser.email, 'admin123');
    await createPrescription({
      code: `RX-ADMIN-${Date.now()}-D`,
      status: PrescriptionStatus.pending,
      createdAt: new Date('2035-02-01T10:00:00.000Z'),
    });
    await createPrescription({
      code: `RX-ADMIN-${Date.now()}-E`,
      status: PrescriptionStatus.consumed,
      createdAt: new Date('2035-02-01T14:00:00.000Z'),
    });
    await createPrescription({
      code: `RX-ADMIN-${Date.now()}-F`,
      status: PrescriptionStatus.pending,
      createdAt: new Date('2035-02-02T09:00:00.000Z'),
      doctorId: testData.otherDoctor.id,
    });

    const response = await request(app.getHttpServer())
      .get(
        '/admin/metrics?from=2035-02-01T00:00:00.000Z' +
          '&to=2035-02-02T23:59:59.999Z',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = response.body as {
      totals: {
        doctors: number;
        patients: number;
        prescriptions: number;
      };
      prescriptionsByStatus: {
        pending: number;
        consumed: number;
      };
      dailySeries: Array<{
        date: string;
        total: number;
      }>;
      topDoctors: Array<{
        doctorId: string;
        total: number;
        doctor: {
          specialty: string | null;
          user: {
            name: string;
            password?: unknown;
            refreshTokenHash?: unknown;
          };
        };
      }>;
    };

    expect(body.totals.doctors).toBeGreaterThanOrEqual(2);
    expect(body.totals.patients).toBeGreaterThanOrEqual(2);
    expect(body.totals.prescriptions).toBe(3);
    expect(body.prescriptionsByStatus).toEqual({
      pending: 2,
      consumed: 1,
    });
    expect(body.dailySeries).toEqual([
      { date: '2035-02-01', total: 2 },
      { date: '2035-02-02', total: 1 },
    ]);
    expect(body.topDoctors[0]).toMatchObject({
      doctorId: testData.doctor.id,
      total: 2,
      doctor: {
        specialty: 'Nutricion clinica',
        user: {
          name: 'Admin Doctor',
        },
      },
    });
    expect(body.topDoctors[0].doctor.user.password).toBeUndefined();
    expect(body.topDoctors[0].doctor.user.refreshTokenHash).toBeUndefined();
  });

  afterAll(async () => {
    await prismaService.prescription.deleteMany({
      where: {
        notes: {
          startsWith: 'e2e: admin',
        },
      },
    });
    await app.close();
  });
});
