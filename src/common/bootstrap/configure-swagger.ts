import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Nutribiotics Prescriptions API')
    .setDescription('API for prescription, patient, doctor, and admin flows.')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste the access token returned by POST /auth/login.',
    })
    .addTag('Auth', 'Authentication and profile endpoints.')
    .addTag('Users', 'Admin user management endpoints.')
    .addTag('Patients', 'Patient directory endpoints.')
    .addTag('Doctors', 'Doctor directory endpoints.')
    .addTag(
      'Prescriptions',
      'Prescription creation, listing, detail, PDF, and consumption endpoints.',
    )
    .addTag('Admin', 'Admin prescription reporting and metrics endpoints.')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
