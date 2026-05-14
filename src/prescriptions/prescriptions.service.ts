import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generatePrescriptionCode } from './helpers/generate-prescription-code';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prismaService: PrismaService) {}

  generateCode() {
    return generatePrescriptionCode();
  }

  async getDoctorFromAuthenticatedUser(userId: string) {
    const doctor = await this.prismaService.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new ForbiddenException('Authenticated user is not a doctor');
    }

    return doctor;
  }

  async verifyPatientExists(patientId: string) {
    const patient = await this.prismaService.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }
}
