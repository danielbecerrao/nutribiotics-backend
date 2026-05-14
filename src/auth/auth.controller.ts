import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiCommonErrorResponses } from '../common/swagger/api-error-responses';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user and return JWT tokens.' })
  @ApiCreatedResponse({ description: 'Authenticated session.' })
  @ApiCommonErrorResponses()
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token and return new tokens.' })
  @ApiCreatedResponse({ description: 'Refreshed session.' })
  @ApiCommonErrorResponses()
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user profile.' })
  @ApiOkResponse({ description: 'Authenticated user profile.' })
  @ApiCommonErrorResponses()
  profile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
