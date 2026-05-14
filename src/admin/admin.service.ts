import { Injectable } from '@nestjs/common';
import { PrescriptionStatus, Prisma } from '@prisma/client';
import {
  buildPaginatedResponse,
  getPagination,
} from '../common/helpers/pagination.helper';
import { buildPrismaDateRangeFilter } from '../common/helpers/prisma-date-filter.helper';
import { getCreatedAtOrder } from '../common/helpers/sort-order.helper';
import { prescriptionWithRelations } from '../prescriptions/types/prescription-with-relations.type';
import { toPublicPrescription } from '../prescriptions/utils/to-public-prescription';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/utils/to-public-user';
import { AdminMetricsQueryDto } from './dto/admin-metrics-query.dto';
import { ListAdminPrescriptionsQueryDto } from './dto/list-admin-prescriptions-query.dto';

const TOP_DOCTORS_LIMIT = 5;

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  async listPrescriptions(query: ListAdminPrescriptionsQueryDto) {
    const pagination = getPagination(query);
    const where = this.buildPrescriptionWhere(query);

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

  async getMetrics(query: AdminMetricsQueryDto) {
    const prescriptionWhere = this.buildPrescriptionWhere(query);
    const [
      totalDoctors,
      totalPatients,
      totalPrescriptions,
      statusGroups,
      dailyPrescriptions,
      topDoctorGroups,
    ] = await this.prismaService.$transaction([
      this.prismaService.doctor.count(),
      this.prismaService.patient.count(),
      this.prismaService.prescription.count({ where: prescriptionWhere }),
      this.prismaService.prescription.groupBy({
        by: ['status'],
        where: prescriptionWhere,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prismaService.prescription.findMany({
        where: prescriptionWhere,
        select: { createdAt: true },
      }),
      this.prismaService.prescription.groupBy({
        by: ['authorId'],
        where: prescriptionWhere,
        orderBy: { authorId: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const topDoctors = await this.getTopDoctors(topDoctorGroups);

    return {
      totals: {
        doctors: totalDoctors,
        patients: totalPatients,
        prescriptions: totalPrescriptions,
      },
      prescriptionsByStatus: this.buildStatusTotals(statusGroups),
      dailySeries: this.buildDailySeries(dailyPrescriptions),
      topDoctors,
    };
  }

  private buildPrescriptionWhere(query: {
    status?: PrescriptionStatus;
    doctorId?: string;
    patientId?: string;
    from?: string;
    to?: string;
  }) {
    const where: Prisma.PrescriptionWhereInput = {};
    const createdAt = buildPrismaDateRangeFilter(query);

    if (query.status) {
      where.status = query.status;
    }

    if (query.doctorId) {
      where.authorId = query.doctorId;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (createdAt) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private buildStatusTotals(
    statusGroups: Array<{
      status: PrescriptionStatus;
      _count?: true | { _all?: number };
    }>,
  ) {
    const totals = {
      [PrescriptionStatus.pending]: 0,
      [PrescriptionStatus.consumed]: 0,
    };

    for (const group of statusGroups) {
      totals[group.status] = this.getGroupCount(group);
    }

    return totals;
  }

  private buildDailySeries(
    prescriptions: Array<{
      createdAt: Date;
    }>,
  ) {
    const counts = new Map<string, number>();

    for (const prescription of prescriptions) {
      const day = prescription.createdAt.toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .map(([date, total]) => ({
        date,
        total,
      }));
  }

  private async getTopDoctors(
    topDoctorGroups: Array<{
      authorId: string;
      _count?: true | { _all?: number };
    }>,
  ) {
    const sortedGroups = [...topDoctorGroups]
      .sort(
        (left, right) => this.getGroupCount(right) - this.getGroupCount(left),
      )
      .slice(0, TOP_DOCTORS_LIMIT);
    const doctorIds = sortedGroups.map((group) => group.authorId);

    if (!doctorIds.length) {
      return [];
    }

    const doctors = await this.prismaService.doctor.findMany({
      where: {
        id: {
          in: doctorIds,
        },
      },
      include: {
        user: true,
      },
    });
    const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));

    return sortedGroups.flatMap((group) => {
      const doctor = doctorById.get(group.authorId);

      if (!doctor) {
        return [];
      }

      return {
        doctorId: doctor.id,
        total: this.getGroupCount(group),
        doctor: {
          id: doctor.id,
          specialty: doctor.specialty,
          user: toPublicUser(doctor.user),
        },
      };
    });
  }

  private getGroupCount(group: { _count?: true | { _all?: number } }) {
    return typeof group._count === 'object' ? (group._count._all ?? 0) : 0;
  }
}
