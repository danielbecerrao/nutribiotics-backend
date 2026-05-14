import { PrescriptionWithRelations } from '../types/prescription-with-relations.type';

export interface PrescriptionPdfItem {
  name: string;
  dosage: string;
  quantity: string;
  instructions: string;
}

export interface PrescriptionPdfData {
  code: string;
  status: string;
  createdAt: Date;
  patient: {
    name: string;
    email: string;
  };
  doctor: {
    name: string;
    email: string;
    specialty: string;
  };
  notes: string;
  items: PrescriptionPdfItem[];
}

export function toPrescriptionPdfData(
  prescription: PrescriptionWithRelations,
): PrescriptionPdfData {
  return {
    code: prescription.code,
    status: prescription.status,
    createdAt: prescription.createdAt,
    patient: {
      name: prescription.patient.user.name,
      email: prescription.patient.user.email,
    },
    doctor: {
      name: prescription.author.user.name,
      email: prescription.author.user.email,
      specialty: prescription.author.specialty ?? 'N/A',
    },
    notes: prescription.notes ?? 'N/A',
    items: prescription.items.map((item) => ({
      name: item.name,
      dosage: item.dosage ?? 'N/A',
      quantity: item.quantity?.toString() ?? 'N/A',
      instructions: item.instructions ?? 'N/A',
    })),
  };
}
