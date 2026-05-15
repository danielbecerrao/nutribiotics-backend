import { Injectable } from '@nestjs/common';
import { AuditLogAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prismaService: PrismaService) {}

  recordPrescriptionConsumed(
    input: {
      actorUserId: string;
      patientId: string;
      prescriptionId: string;
    },
    database: PrismaExecutor = this.prismaService,
  ) {
    return database.auditLog.create({
      data: {
        action: AuditLogAction.prescription_consumed,
        actorUserId: input.actorUserId,
        prescriptionId: input.prescriptionId,
        metadata: {
          patientId: input.patientId,
        },
      },
    });
  }
}
