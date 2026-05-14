import { toPublicUser } from '../../users/utils/to-public-user';
import { PrescriptionWithRelations } from '../types/prescription-with-relations.type';

export function toPublicPrescription(prescription: PrescriptionWithRelations) {
  const { patient, author, ...prescriptionData } = prescription;

  return {
    ...prescriptionData,
    patient: {
      ...patient,
      user: toPublicUser(patient.user),
    },
    author: {
      ...author,
      user: toPublicUser(author.user),
    },
  };
}
