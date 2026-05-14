import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionStatus, Prisma, Role } from '@prisma/client';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { buildPrismaDateRangeFilter } from '../common/helpers/prisma-date-filter.helper';
import {
  buildPaginatedResponse,
  getPagination,
} from '../common/helpers/pagination.helper';
import { getCreatedAtOrder } from '../common/helpers/sort-order.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListDoctorPrescriptionsQueryDto } from './dto/list-doctor-prescriptions-query.dto';
import { ListPatientPrescriptionsQueryDto } from './dto/list-patient-prescriptions-query.dto';
import { generatePrescriptionCode } from './helpers/generate-prescription-code';
import { PrescriptionPdfRenderer } from './pdf/prescription-pdf.renderer';
import { toPrescriptionPdfData } from './pdf/prescription-pdf-data';
import { prescriptionWithRelations } from './types/prescription-with-relations.type';
import { toPublicPrescription } from './utils/to-public-prescription';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly prescriptionPdfRenderer: PrescriptionPdfRenderer,
  ) {}

  generateCode() {
    return generatePrescriptionCode();
  }

  async createPrescription(userId: string, input: CreatePrescriptionDto) {
    const prescription = await this.prismaService.$transaction(
      async (transaction) => {
        const doctor = await this.getDoctorFromAuthenticatedUser(
          userId,
          transaction,
        );

        await this.verifyPatientExists(input.patientId, transaction);

        return transaction.prescription.create({
          data: {
            code: this.generateCode(),
            notes: input.notes,
            patientId: input.patientId,
            authorId: doctor.id,
            items: {
              create: input.items,
            },
          },
          include: prescriptionWithRelations,
        });
      },
    );

    return toPublicPrescription(prescription);
  }

  async listDoctorPrescriptions(
    userId: string,
    query: ListDoctorPrescriptionsQueryDto,
  ) {
    const doctor = await this.getDoctorFromAuthenticatedUser(userId);
    const pagination = getPagination(query);
    const where: Prisma.PrescriptionWhereInput = {
      authorId: doctor.id,
    };
    const createdAt = buildPrismaDateRangeFilter(query);

    if (query.status) {
      where.status = query.status;
    }

    if (createdAt) {
      where.createdAt = createdAt;
    }

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.prescription.count({ where }),
      this.prismaService.prescription.findMany({
        where,
        include: prescriptionWithRelations,
        orderBy: getCreatedAtOrder(query.order),
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return buildPaginatedResponse(
      data.map(toPublicPrescription),
      total,
      pagination,
    );
  }

  async listPatientPrescriptions(
    userId: string,
    query: ListPatientPrescriptionsQueryDto,
  ) {
    const patient = await this.getPatientFromAuthenticatedUser(userId);
    const pagination = getPagination(query);
    const where: Prisma.PrescriptionWhereInput = {
      patientId: patient.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.prescription.count({ where }),
      this.prismaService.prescription.findMany({
        where,
        include: prescriptionWithRelations,
        orderBy: getCreatedAtOrder(),
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return buildPaginatedResponse(
      data.map(toPublicPrescription),
      total,
      pagination,
    );
  }

  async getPrescriptionByIdForAuthenticatedUser(
    user: AccessTokenPayload,
    prescriptionId: string,
  ) {
    if (user.role === Role.doctor) {
      return this.getDoctorPrescriptionById(user.sub, prescriptionId);
    }

    return this.getPatientPrescriptionById(user.sub, prescriptionId);
  }

  async getPrescriptionPdfForAuthenticatedUser(
    user: AccessTokenPayload,
    prescriptionId: string,
  ) {
    const prescription = await this.findPrescriptionForDownload(
      user,
      prescriptionId,
    );
    const pdf = await this.prescriptionPdfRenderer.render(
      toPrescriptionPdfData(prescription),
    );

    return {
      pdf,
      filename: this.getPrescriptionPdfFilename(prescription.code),
    };
  }

  async getDoctorPrescriptionById(userId: string, prescriptionId: string) {
    const doctor = await this.getDoctorFromAuthenticatedUser(userId);
    const prescription = await this.prismaService.prescription.findFirst({
      where: {
        id: prescriptionId,
        authorId: doctor.id,
      },
      include: prescriptionWithRelations,
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return toPublicPrescription(prescription);
  }

  async getPatientPrescriptionById(userId: string, prescriptionId: string) {
    const patient = await this.getPatientFromAuthenticatedUser(userId);
    const prescription = await this.prismaService.prescription.findFirst({
      where: {
        id: prescriptionId,
        patientId: patient.id,
      },
      include: prescriptionWithRelations,
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return toPublicPrescription(prescription);
  }

  async consumePrescription(userId: string, prescriptionId: string) {
    const patient = await this.getPatientFromAuthenticatedUser(userId);
    const prescription = await this.prismaService.prescription.findFirst({
      where: {
        id: prescriptionId,
        patientId: patient.id,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (prescription.status !== PrescriptionStatus.pending) {
      throw new ConflictException('Prescription already consumed');
    }

    const updatedPrescription = await this.prismaService.prescription.update({
      where: { id: prescription.id },
      data: {
        status: PrescriptionStatus.consumed,
        consumedAt: new Date(),
      },
      include: prescriptionWithRelations,
    });

    return toPublicPrescription(updatedPrescription);
  }

  private async findPrescriptionForDownload(
    user: AccessTokenPayload,
    prescriptionId: string,
  ) {
    const prescription = await this.prismaService.prescription.findUnique({
      where: { id: prescriptionId },
      include: prescriptionWithRelations,
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const canDownload =
      user.role === Role.admin ||
      (user.role === Role.doctor && prescription.author.userId === user.sub) ||
      (user.role === Role.patient && prescription.patient.userId === user.sub);

    if (!canDownload) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  private getPrescriptionPdfFilename(code: string) {
    const safeCode = code.replace(/[^a-zA-Z0-9-]/g, '-');
    return `prescription-${safeCode}.pdf`;
  }

  async getDoctorFromAuthenticatedUser(
    userId: string,
    database: PrismaExecutor = this.prismaService,
  ) {
    const doctor = await database.doctor.findUnique({
      where: { userId },
    });

    if (!doctor) {
      throw new ForbiddenException('Authenticated user is not a doctor');
    }

    return doctor;
  }

  async getPatientFromAuthenticatedUser(
    userId: string,
    database: PrismaExecutor = this.prismaService,
  ) {
    const patient = await database.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      throw new ForbiddenException('Authenticated user is not a patient');
    }

    return patient;
  }

  async verifyPatientExists(
    patientId: string,
    database: PrismaExecutor = this.prismaService,
  ) {
    const patient = await database.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }
}
