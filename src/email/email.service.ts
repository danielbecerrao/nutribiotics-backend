import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PrescriptionCreatedEmailInput {
  code: string;
  doctorName: string;
  patientEmail: string;
  patientName: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  sendPrescriptionCreated(input: PrescriptionCreatedEmailInput) {
    const provider = this.configService.get<string>(
      'EMAIL_PROVIDER',
      'console',
    );

    if (provider !== 'console') {
      return;
    }

    const sender = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@nutribiotics.local',
    );

    this.logger.log(
      `Email queued from ${sender} to ${input.patientEmail}: prescription ${input.code} created by ${input.doctorName} for ${input.patientName}.`,
    );
  }
}
