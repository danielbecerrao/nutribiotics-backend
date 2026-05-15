import { PrismaService } from '../../src/prisma/prisma.service';

interface CleanE2eDataOptions {
  notesPrefix?: string;
  userEmailDomain?: string;
}

export async function cleanE2eData(
  prismaService: PrismaService,
  options: CleanE2eDataOptions,
) {
  if (options.notesPrefix) {
    await prismaService.prescription.deleteMany({
      where: {
        notes: {
          startsWith: options.notesPrefix,
        },
      },
    });
  }

  if (options.userEmailDomain) {
    await prismaService.user.deleteMany({
      where: {
        email: {
          endsWith: `@${options.userEmailDomain}`,
        },
      },
    });
  }
}
