import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { Branch } from '../branches/entities/branch.entity';
import { BranchContextGuard } from './guards/branch-context.guard';

@Module({
  imports: [
    ThrottlerModule,
    ConfigModule,
    TypeOrmModule.forFeature([User, Tenant, Branch]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, BranchContextGuard],
  // BranchContextGuard se exporta para que cualquier modulo pueda resolver la
  // sede de la peticion sin registrar de nuevo el repositorio de Branch.
  exports: [AuthService, BranchContextGuard],
})
export class AuthModule {}