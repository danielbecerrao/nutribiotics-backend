import { PaginatedResponse } from '../types/paginated-response.type';

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginationResult extends PaginationInput {
  skip: number;
  take: number;
}

export function getPagination({
  page,
  limit,
}: PaginationInput): PaginationResult {
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationInput,
): PaginatedResponse<T> {
  return {
    data,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
}
