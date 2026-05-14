import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  const findUnique = jest.fn();
  const prismaService = {
    user: {
      findUnique,
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  it('findByEmail returns the matching user', async () => {
    const user: User = {
      id: 'user_1',
      email: 'admin@test.com',
      password: 'hashed',
      name: 'Admin Test',
      role: Role.admin,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    };

    findUnique.mockResolvedValue(user);

    await expect(usersService.findByEmail(' admin@test.com ')).resolves.toEqual(
      user,
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@test.com' },
    });
  });
});
