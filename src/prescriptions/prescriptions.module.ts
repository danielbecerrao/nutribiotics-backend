import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  MePrescriptionsController,
  PrescriptionsController,
} from './prescriptions.controller';
import { PrescriptionPdfRenderer } from './pdf/prescription-pdf.renderer';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [AuditLogsModule, EmailModule, PrismaModule],
  controllers: [PrescriptionsController, MePrescriptionsController],
  providers: [PrescriptionsService, PrescriptionPdfRenderer],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
