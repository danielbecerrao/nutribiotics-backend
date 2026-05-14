import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Doctor, Patient, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/bootstrap/configure-app';
import { PrismaService } from './../src/prisma/prisma.service';

interface AuthResponseBody {
  accessToken: string;
}

interface PrescriptionResponseBody {
  id: string;
  code: string;
  status: string;
  notes: string | null;
  consumedAt: string | null;
  patientId: string;
  authorId: string;
  items: Array<{
    id: string;
    name: string;
    dosage?: string | null;
    quantity?: number | null;
    instructions?: string | null;
  }>;
  patient: {
    user: {
      password?: unknown;
      refreshTokenHash?: unknown;
    };
  };
  author: {
    user: {
      password?: unknown;
      refreshTokenHash?: unknown;
    };
  };
}

interface PrescriptionTestData {
  adminUser: User;
  doctorUser: User;
  otherDoctorUser: User;
  patientUser: User;
  otherPatientUser: User;
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
): Promise<PrescriptionTestData> {
  const adminUser = await upsertUser(prismaService, {
    email: 'rx-admin@test.com',
    password: 'admin123',
    name: 'Prescription Admin',
    role: Role.admin,
  });
  const doctorUser = await upsertUser(prismaService, {
    email: 'rx-doctor@test.com',
    password: 'doctor123',
    name: 'Prescription Doctor',
    role: Role.doctor,
  });
  const otherDoctorUser = await upsertUser(prismaService, {
    email: 'rx-other-doctor@test.com',
    password: 'doctor123',
    name: 'Other Prescription Doctor',
    role: Role.doctor,
  });
  const patientUser = await upsertUser(prismaService, {
    email: 'rx-patient@test.com',
    password: 'patient123',
    name: 'Prescription Patient',
    role: Role.patient,
  });
  const otherPatientUser = await upsertUser(prismaService, {
    email: 'rx-other-patient@test.com',
    password: 'patient123',
    name: 'Other Prescription Patient',
    role: Role.patient,
  });

  const doctor = await prismaService.doctor.upsert({
    where: { userId: doctorUser.id },
    update: { specialty: 'Medicina interna' },
    create: {
      userId: doctorUser.id,
      specialty: 'Medicina interna',
    },
  });
  const otherDoctor = await prismaService.doctor.upsert({
    where: { userId: otherDoctorUser.id },
    update: { specialty: 'Medicina general' },
    create: {
      userId: otherDoctorUser.id,
      specialty: 'Medicina general',
    },
  });
  const patient = await prismaService.patient.upsert({
    where: { userId: patientUser.id },
    update: { birthDate: new Date('1990-05-15T00:00:00.000Z') },
    create: {
      userId: patientUser.id,
      birthDate: new Date('1990-05-15T00:00:00.000Z'),
    },
  });
  const otherPatient = await prismaService.patient.upsert({
    where: { userId: otherPatientUser.id },
    update: { birthDate: new Date('1992-08-20T00:00:00.000Z') },
    create: {
      userId: otherPatientUser.id,
      birthDate: new Date('1992-08-20T00:00:00.000Z'),
    },
  });

  return {
    adminUser,
    doctorUser,
    otherDoctorUser,
    patientUser,
    otherPatientUser,
    doctor,
    otherDoctor,
    patient,
    otherPatient,
  };
}

describe('Prescriptions (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let testData: PrescriptionTestData;

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    const body = response.body as AuthResponseBody;

    return body.accessToken;
  }

  function createPendingPrescription(patientId = testData.patient.id) {
    return prismaService.prescription.create({
      data: {
        code: `RX-E2E-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        notes: 'e2e: patient prescription',
        patientId,
        authorId: testData.doctor.id,
        items: {
          create: [
            {
              name: 'Acetaminofen 500mg',
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
          startsWith: 'e2e:',
        },
      },
    });
  });

  it('/prescriptions (POST) creates a prescription for the authenticated doctor', async () => {
    const token = await login(testData.doctorUser.email, 'doctor123');
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: testData.patient.id,
        notes: 'e2e: created prescription',
        items: [
          {
            name: 'Amoxicilina 500mg',
            dosage: '1 cada 8 horas',
            quantity: 21,
            instructions: 'Tomar despues de comer.',
          },
        ],
      })
      .expect(201);
    const body = response.body as PrescriptionResponseBody;

    expect(body.code).toMatch(/^RX-\d{8}-[A-F0-9]{8}$/);
    expect(body.patientId).toBe(testData.patient.id);
    expect(body.authorId).toBe(testData.doctor.id);
    expect(body.status).toBe('pending');
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      name: 'Amoxicilina 500mg',
      dosage: '1 cada 8 horas',
      quantity: 21,
      instructions: 'Tomar despues de comer.',
    });
    expect(body.patient.user.password).toBeUndefined();
    expect(body.patient.user.refreshTokenHash).toBeUndefined();
    expect(body.author.user.password).toBeUndefined();
    expect(body.author.user.refreshTokenHash).toBeUndefined();
  });

  it('/prescriptions (POST) returns 404 when patient does not exist', async () => {
    const token = await login(testData.doctorUser.email, 'doctor123');

    return request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'missing_patient',
        notes: 'e2e: missing patient',
        items: [
          {
            name: 'Ibuprofeno 400mg',
          },
        ],
      })
      .expect(404)
      .expect({
        message: 'Patient not found',
        code: 'NOT_FOUND',
        details: {},
      });
  });

  it('/prescriptions/:id (GET) hides prescriptions authored by another doctor', async () => {
    const token = await login(testData.doctorUser.email, 'doctor123');
    const foreignPrescription = await prismaService.prescription.create({
      data: {
        code: `RX-E2E-${Date.now()}`,
        notes: 'e2e: foreign prescription',
        patientId: testData.patient.id,
        authorId: testData.otherDoctor.id,
        items: {
          create: [
            {
              name: 'Loratadina 10mg',
            },
          ],
        },
      },
    });

    return request(app.getHttpServer())
      .get(`/prescriptions/${foreignPrescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect({
        message: 'Prescription not found',
        code: 'NOT_FOUND',
        details: {},
      });
  });

  it('/me/prescriptions (GET) lists prescriptions owned by the patient', async () => {
    const token = await login(testData.patientUser.email, 'patient123');
    const prescription = await createPendingPrescription();
    await createPendingPrescription(testData.otherPatient.id);

    const response = await request(app.getHttpServer())
      .get('/me/prescriptions?status=pending&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = response.body as {
      data: PrescriptionResponseBody[];
      total: number;
      page: number;
      limit: number;
    };

    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data.some((item) => item.id === prescription.id)).toBe(true);
    expect(
      body.data.every((item) => item.patientId === testData.patient.id),
    ).toBe(true);
  });

  it('/prescriptions/:id (GET) allows patient owner and hides foreign detail', async () => {
    const token = await login(testData.patientUser.email, 'patient123');
    const prescription = await createPendingPrescription();
    const foreignPrescription = await createPendingPrescription(
      testData.otherPatient.id,
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const detail = detailResponse.body as PrescriptionResponseBody;

    expect(detail.id).toBe(prescription.id);
    expect(detail.patientId).toBe(testData.patient.id);

    await request(app.getHttpServer())
      .get(`/prescriptions/${foreignPrescription.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect({
        message: 'Prescription not found',
        code: 'NOT_FOUND',
        details: {},
      });
  });

  it('/prescriptions/:id/consume (PUT) consumes a pending prescription owned by the patient', async () => {
    const token = await login(testData.patientUser.email, 'patient123');
    const prescription = await createPendingPrescription();

    const response = await request(app.getHttpServer())
      .put(`/prescriptions/${prescription.id}/consume`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = response.body as PrescriptionResponseBody;

    expect(body.id).toBe(prescription.id);
    expect(body.status).toBe('consumed');
    expect(typeof body.consumedAt).toBe('string');
    expect(body.patientId).toBe(testData.patient.id);
  });

  it('/prescriptions/:id/consume (PUT) hides prescriptions owned by another patient', async () => {
    const token = await login(testData.patientUser.email, 'patient123');
    const foreignPrescription = await createPendingPrescription(
      testData.otherPatient.id,
    );

    return request(app.getHttpServer())
      .put(`/prescriptions/${foreignPrescription.id}/consume`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
      .expect({
        message: 'Prescription not found',
        code: 'NOT_FOUND',
        details: {},
      });
  });

  it('/prescriptions/:id/consume (PUT) returns conflict when prescription was already consumed', async () => {
    const token = await login(testData.patientUser.email, 'patient123');
    const prescription = await prismaService.prescription.create({
      data: {
        code: `RX-E2E-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        notes: 'e2e: already consumed prescription',
        patientId: testData.patient.id,
        authorId: testData.doctor.id,
        status: 'consumed',
        consumedAt: new Date(),
        items: {
          create: [
            {
              name: 'Ibuprofeno 400mg',
            },
          ],
        },
      },
    });

    return request(app.getHttpServer())
      .put(`/prescriptions/${prescription.id}/consume`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409)
      .expect({
        message: 'Prescription already consumed',
        code: 'CONFLICT',
        details: {},
      });
  });

  it('/prescriptions/:id/pdf (GET) returns a downloadable PDF', async () => {
    const token = await login(testData.doctorUser.email, 'doctor123');
    const prescription = await createPendingPrescription();

    const response = await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      `prescription-${prescription.code}.pdf`,
    );
  });

  it('/prescriptions/:id/pdf (GET) enforces related-user permissions', async () => {
    const prescription = await createPendingPrescription();
    const doctorToken = await login(testData.doctorUser.email, 'doctor123');
    const patientToken = await login(testData.patientUser.email, 'patient123');
    const adminToken = await login(testData.adminUser.email, 'admin123');
    const otherDoctorToken = await login(
      testData.otherDoctorUser.email,
      'doctor123',
    );
    const otherPatientToken = await login(
      testData.otherPatientUser.email,
      'patient123',
    );

    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}/pdf`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}/pdf`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}/pdf`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}/pdf`)
      .set('Authorization', `Bearer ${otherDoctorToken}`)
      .expect(404)
      .expect({
        message: 'Prescription not found',
        code: 'NOT_FOUND',
        details: {},
      });
    await request(app.getHttpServer())
      .get(`/prescriptions/${prescription.id}/pdf`)
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .expect(404)
      .expect({
        message: 'Prescription not found',
        code: 'NOT_FOUND',
        details: {},
      });
  });

  afterAll(async () => {
    await prismaService.prescription.deleteMany({
      where: {
        notes: {
          startsWith: 'e2e:',
        },
      },
    });
    await app.close();
  });
});
