import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';

interface TestUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

interface TestDoctorInput extends Omit<TestUserInput, 'role'> {
  specialty?: string;
}

interface TestPatientInput extends Omit<TestUserInput, 'role'> {
  birthDate?: Date;
}

export async function upsertTestUser(
  prismaService: PrismaService,
  input: TestUserInput,
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

export async function upsertTestDoctor(
  prismaService: PrismaService,
  input: TestDoctorInput,
) {
  const user = await upsertTestUser(prismaService, {
    ...input,
    role: Role.doctor,
  });
  const doctor = await prismaService.doctor.upsert({
    where: { userId: user.id },
    update: { specialty: input.specialty ?? null },
    create: {
      specialty: input.specialty ?? null,
      userId: user.id,
    },
  });

  return { doctor, user };
}

export async function upsertTestPatient(
  prismaService: PrismaService,
  input: TestPatientInput,
) {
  const user = await upsertTestUser(prismaService, {
    ...input,
    role: Role.patient,
  });
  const patient = await prismaService.patient.upsert({
    where: { userId: user.id },
    update: { birthDate: input.birthDate ?? null },
    create: {
      birthDate: input.birthDate ?? null,
      userId: user.id,
    },
  });

  return { patient, user };
}
