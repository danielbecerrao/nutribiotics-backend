import { Prisma } from '@prisma/client';
import { DateRangeQueryDto } from '../dto/date-range-query.dto';

export function buildPrismaDateRangeFilter({
  from,
  to,
}: DateRangeQueryDto): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (from) {
    filter.gte = new Date(from);
  }

  if (to) {
    filter.lte = new Date(to);
  }

  return filter;
}
