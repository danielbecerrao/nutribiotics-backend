import { Prisma } from '@prisma/client';

export const prescriptionWithRelations = {
  items: true,
  patient: {
    include: {
      user: true,
    },
  },
  author: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.PrescriptionInclude;

export type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: typeof prescriptionWithRelations;
}>;
