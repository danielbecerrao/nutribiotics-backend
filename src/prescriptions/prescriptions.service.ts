import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPrismaDateRangeFilter } from '../common/helpers/prisma-date-filter.helper';
import {
  buildPaginatedResponse,
  getPagination,
} from '../common/helpers/pagination.helper';
import { getCreatedAtOrder } from '../common/helpers/sort-order.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListDoctorPrescriptionsQueryDto } from './dto/list-doctor-prescriptions-query.dto';
import { generatePrescriptionCode } from './helpers/generate-prescription-code';
import { prescriptionWithRelations } from './types/prescription-with-relations.type';
import { toPublicPrescription } from './utils/to-public-prescription';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prismaService: PrismaService) {}

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
