import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiCommonErrorResponses } from '../common/swagger/api-error-responses';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';
import { toPublicUser } from './utils/to-public-user';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.admin)
  @Get()
  @ApiOperation({ summary: 'List users for admin management.' })
  @ApiOkResponse({ description: 'Paginated user list.' })
  @ApiCommonErrorResponses()
  async listUsers(@Query() query: ListUsersQueryDto) {
    const { data, ...meta } = await this.usersService.listUsers(query);

    return {
      ...meta,
      data: data.map(toPublicUser),
    };
  }

  @Roles(Role.admin)
  @Post()
  @ApiOperation({ summary: 'Create a user account.' })
  @ApiCreatedResponse({ description: 'Created user without sensitive fields.' })
  @ApiCommonErrorResponses()
  async createUser(@Body() body: CreateUserDto) {
    const user = await this.usersService.createUser(body);
    return toPublicUser(user);
  }
}
