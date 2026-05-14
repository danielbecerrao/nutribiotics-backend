import { buildPaginatedResponse, getPagination } from './pagination.helper';

describe('pagination helpers', () => {
  it('calculates skip and take from page and limit', () => {
    expect(getPagination({ page: 3, limit: 25 })).toEqual({
      page: 3,
      limit: 25,
      skip: 50,
      take: 25,
    });
  });

  it('builds paginated response metadata', () => {
    expect(
      buildPaginatedResponse([{ id: 'item_1' }, { id: 'item_2' }], 42, {
        page: 2,
        limit: 20,
      }),
    ).toEqual({
      data: [{ id: 'item_1' }, { id: 'item_2' }],
      page: 2,
      limit: 20,
      total: 42,
      totalPages: 3,
    });
  });
});
