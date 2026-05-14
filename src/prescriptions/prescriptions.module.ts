import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  MePrescriptionsController,
  PrescriptionsController,
} from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionsController, MePrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
