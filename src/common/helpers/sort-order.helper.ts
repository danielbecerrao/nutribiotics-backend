import { SortOrder } from '../dto/sort-order-query.dto';

export const DEFAULT_CREATED_AT_ORDER = {
  createdAt: SortOrder.desc,
} as const;

export function getCreatedAtOrder(order: SortOrder = SortOrder.desc) {
  return {
    createdAt: order,
  };
}
