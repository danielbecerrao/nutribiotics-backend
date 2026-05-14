import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PrescriptionStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const passwordRounds = 10;

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function seedPrescriptionCode(sequence: number) {
  return `RX-SEED-${sequence.toString().padStart(3, '0')}`;
}

async function upsertUser(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}) {
  const password = await bcrypt.hash(input.password, passwordRounds);

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      password,
      name: input.name,
      role: input.role,
    },
    create: {
      email: input.email,
      password,
      name: input.name,
      role: input.role,
    },
  });
}

async function main() {
  await upsertUser({
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin Test',
    role: Role.admin,
  });

  const doctorUser = await upsertUser({
    email: 'dr@test.com',
    password: 'dr123',
    name: 'Doctor Test',
    role: Role.doctor,
  });

  const patientUser = await upsertUser({
    email: 'patient@test.com',
    password: 'patient123',
    name: 'Patient Test',
    role: Role.patient,
  });

  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: { specialty: 'Medicina general' },
    create: {
      userId: doctorUser.id,
      specialty: 'Medicina general',
    },
  });

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: { birthDate: new Date('1990-05-15T00:00:00.000Z') },
    create: {
      userId: patientUser.id,
      birthDate: new Date('1990-05-15T00:00:00.000Z'),
    },
  });

  await prisma.prescription.deleteMany({
    where: { code: { startsWith: 'RX-SEED-' } },
  });

  const prescriptions = [
    {
      code: seedPrescriptionCode(1),
      status: PrescriptionStatus.pending,
      notes: 'Tratamiento inicial por infeccion respiratoria.',
      createdAt: daysAgo(1),
      items: [
        {
          name: 'Amoxicilina 500mg',
          dosage: '1 cada 8 horas',
          quantity: 21,
          instructions: 'Tomar despues de comer.',
        },
        {
          name: 'Acetaminofen 500mg',
          dosage: '1 cada 6 horas',
          quantity: 12,
          instructions: 'Tomar solo si hay fiebre o dolor.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(2),
      status: PrescriptionStatus.consumed,
      notes: 'Control de dolor e inflamacion.',
      createdAt: daysAgo(3),
      items: [
        {
          name: 'Ibuprofeno 400mg',
          dosage: '1 cada 8 horas',
          quantity: 9,
          instructions: 'Evitar si hay gastritis activa.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(3),
      status: PrescriptionStatus.pending,
      notes: 'Manejo de sintomas alergicos.',
      createdAt: daysAgo(5),
      items: [
        {
          name: 'Loratadina 10mg',
          dosage: '1 al dia',
          quantity: 10,
          instructions: 'Tomar en la noche.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(4),
      status: PrescriptionStatus.consumed,
      notes: 'Proteccion gastrica.',
      createdAt: daysAgo(8),
      items: [
        {
          name: 'Omeprazol 20mg',
          dosage: '1 al dia',
          quantity: 14,
          instructions: 'Tomar en ayunas.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(5),
      status: PrescriptionStatus.pending,
      notes: 'Control metabolico inicial.',
      createdAt: daysAgo(11),
      items: [
        {
          name: 'Metformina 850mg',
          dosage: '1 cada 12 horas',
          quantity: 60,
          instructions: 'Tomar con alimentos.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(6),
      status: PrescriptionStatus.consumed,
      notes: 'Suplementacion por deficiencia.',
      createdAt: daysAgo(14),
      items: [
        {
          name: 'Vitamina D 2000 UI',
          dosage: '1 al dia',
          quantity: 30,
          instructions: 'Tomar con comida principal.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(7),
      status: PrescriptionStatus.pending,
      notes: 'Manejo de congestion nasal.',
      createdAt: daysAgo(20),
      items: [
        {
          name: 'Solucion salina nasal',
          dosage: '2 aplicaciones cada 6 horas',
          quantity: 1,
          instructions: 'Aplicar en cada fosa nasal.',
        },
      ],
    },
    {
      code: seedPrescriptionCode(8),
      status: PrescriptionStatus.consumed,
      notes: 'Control de tos seca.',
      createdAt: daysAgo(26),
      items: [
        {
          name: 'Dextrometorfano jarabe',
          dosage: '10 ml cada 8 horas',
          quantity: 1,
          instructions: 'No combinar con alcohol.',
        },
      ],
    },
  ];

  for (const prescription of prescriptions) {
    await prisma.prescription.create({
      data: {
        code: prescription.code,
        status: prescription.status,
        notes: prescription.notes,
        createdAt: prescription.createdAt,
        consumedAt:
          prescription.status === PrescriptionStatus.consumed
            ? new Date(prescription.createdAt.getTime() + 24 * 60 * 60 * 1000)
            : null,
        authorId: doctor.id,
        patientId: patient.id,
        items: {
          create: prescription.items,
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
