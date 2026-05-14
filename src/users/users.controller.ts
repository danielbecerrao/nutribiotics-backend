import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';
import { toPublicUser } from './utils/to-public-user';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.admin)
  @Get()
  async listUsers(@Query() query: ListUsersQueryDto) {
    const { data, ...meta } = await this.usersService.listUsers(query);

    return {
      ...meta,
      data: data.map(toPublicUser),
    };
  }

  @Roles(Role.admin)
  @Post()
  async createUser(@Body() body: CreateUserDto) {
    const user = await this.usersService.createUser(body);
    return toPublicUser(user);
  }
}
