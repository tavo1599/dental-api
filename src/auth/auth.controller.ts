import { Patch, Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Throttle } from '@nestjs/throttler';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';

// Rate limit SOLO en este controlador: son los endpoints sin autenticar y por
// tanto los unicos expuestos a fuerza bruta y abuso.
@UseGuards(AuthThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } }) // 5 por hora
  register(@Body() registerDto: RegisterAuthDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 por minuto
  login(@Body() loginDto: LoginAuthDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 900_000 } }) // 3 cada 15 min (evita bombardeo de correos)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 900_000 } }) // 10 cada 15 min
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
  
  // ------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req) {
    // En lugar de: return req.user; (que son datos viejos del token)
    // Pedimos los datos frescos a la base de datos:
    return this.authService.findUserById(req.user.sub);
  }

  @Patch('profile')
@UseGuards(AuthGuard('jwt'))
updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
  return this.authService.updateProfile(req.user.sub, dto);
}
}