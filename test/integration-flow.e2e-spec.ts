import { INestApplication } from '@nestjs/common';
import { PrescriptionStatus, Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginTestUser } from './helpers/auth';
import { cleanE2eData } from './helpers/database';
import { closeE2eApp, createE2eApp } from './helpers/e2e-app';
import {
  upsertTestDoctor,
  upsertTestPatient,
  upsertTestUser,
} from './helpers/test-users';

const notesPrefix = 'e2e: integration flow';
const userEmailDomain = 'integration.e2e.test';
const doctorPassword = 'doctor123';
const patientPassword = 'patient123';
const adminPassword = 'admin123';
const metricsDate = new Date('2036-06-15T10:00:00.000Z');

interface IntegrationActors {
  adminUser: {
    email: string;
  };
  doctor: {
    id: string;
  };
  doctorUser: {
    email: string;
  };
  patient: {
    id: string;
  };
  patientUser: {
    email: string;
  };
}

interface PrescriptionResponseBody {
  authorId: string;
  code: string;
  consumedAt: string | null;
  id: string;
  items: Array<{
    dosage?: string | null;
    instructions?: string | null;
    name: string;
    quantity?: number | null;
  }>;
  patientId: string;
  status: PrescriptionStatus;
}

describe('Integrated prescription flow (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prismaService: PrismaService;
  let actors: IntegrationActors;

  beforeAll(async () => {
    const testApp = await createE2eApp();

    app = testApp.app;
    server = app.getHttpServer() as App;
    prismaService = testApp.prismaService;

    await cleanE2eData(prismaService, {
      notesPrefix,
      userEmailDomain,
    });
    actors = await createActors(prismaService);
  });

  beforeEach(async () => {
    await cleanE2eData(prismaService, {
      notesPrefix,
    });
  });

  it('supports doctor creation, patient consumption, PDF download, and admin metrics', async () => {
    const doctorSession = await loginTestUser(
      app,
      actors.doctorUser.email,
      doctorPassword,
    );

    const createResponse = await request(server)
      .post('/prescriptions')
      .set('Authorization', `Bearer ${doctorSession.accessToken}`)
      .send({
        patientId: actors.patient.id,
        notes: `${notesPrefix}: doctor creates prescription`,
        items: [
          {
            dosage: '1 capsule daily',
            instructions: 'Take after breakfast.',
            name: 'Vitamin D',
            quantity: 30,
          },
        ],
      })
      .expect(201);
    const createdPrescription = createResponse.body as PrescriptionResponseBody;

    expect(createdPrescription).toMatchObject({
      authorId: actors.doctor.id,
      patientId: actors.patient.id,
      status: PrescriptionStatus.pending,
    });
    expect(createdPrescription.items).toHaveLength(1);

    await prismaService.prescription.update({
      where: { id: createdPrescription.id },
      data: { createdAt: metricsDate },
    });

    const patientSession = await loginTestUser(
      app,
      actors.patientUser.email,
      patientPassword,
    );

    const listResponse = await request(server)
      .get('/me/prescriptions?status=pending&page=1&limit=10')
      .set('Authorization', `Bearer ${patientSession.accessToken}`)
      .expect(200);
    const listBody = listResponse.body as {
      data: PrescriptionResponseBody[];
      total: number;
    };

    expect(listBody.total).toBeGreaterThanOrEqual(1);
    expect(
      listBody.data.some((item) => item.id === createdPrescription.id),
    ).toBe(true);

    const consumeResponse = await request(server)
      .put(`/prescriptions/${createdPrescription.id}/consume`)
      .set('Authorization', `Bearer ${patientSession.accessToken}`)
      .expect(200);
    const consumedPrescription =
      consumeResponse.body as PrescriptionResponseBody;

    expect(consumedPrescription.status).toBe(PrescriptionStatus.consumed);
    expect(typeof consumedPrescription.consumedAt).toBe('string');

    const pdfResponse = await request(server)
      .get(`/prescriptions/${createdPrescription.id}/pdf`)
      .set('Authorization', `Bearer ${patientSession.accessToken}`)
      .expect(200);

    expect(pdfResponse.headers['content-type']).toContain('application/pdf');
    expect(pdfResponse.headers['content-disposition']).toContain(
      `prescription-${createdPrescription.code}.pdf`,
    );

    const adminSession = await loginTestUser(
      app,
      actors.adminUser.email,
      adminPassword,
    );
    const metricsResponse = await request(server)
      .get(
        '/admin/metrics?from=2036-06-15T00:00:00.000Z' +
          '&to=2036-06-15T23:59:59.999Z',
      )
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);
    const metrics = metricsResponse.body as {
      dailySeries: Array<{ date: string; total: number }>;
      prescriptionsByStatus: {
        consumed: number;
        pending: number;
      };
      topDoctors: Array<{
        doctorId: string;
        total: number;
      }>;
      totals: {
        prescriptions: number;
      };
    };

    expect(metrics.totals.prescriptions).toBe(1);
    expect(metrics.prescriptionsByStatus).toEqual({
      consumed: 1,
      pending: 0,
    });
    expect(metrics.dailySeries).toEqual([{ date: '2036-06-15', total: 1 }]);
    expect(metrics.topDoctors[0]).toMatchObject({
      doctorId: actors.doctor.id,
      total: 1,
    });
  });

  afterAll(async () => {
    await cleanE2eData(prismaService, {
      notesPrefix,
      userEmailDomain,
    });
    await closeE2eApp(app);
  });
});

async function createActors(
  prismaService: PrismaService,
): Promise<IntegrationActors> {
  const adminUser = await upsertTestUser(prismaService, {
    email: `admin@${userEmailDomain}`,
    name: 'Integration Admin',
    password: adminPassword,
    role: Role.admin,
  });
  const { doctor, user: doctorUser } = await upsertTestDoctor(prismaService, {
    email: `doctor@${userEmailDomain}`,
    name: 'Integration Doctor',
    password: doctorPassword,
    specialty: 'Clinical nutrition',
  });
  const { patient, user: patientUser } = await upsertTestPatient(
    prismaService,
    {
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      email: `patient@${userEmailDomain}`,
      name: 'Integration Patient',
      password: patientPassword,
    },
  );

  return {
    adminUser,
    doctor,
    doctorUser,
    patient,
    patientUser,
  };
}
