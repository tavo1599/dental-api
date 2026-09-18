// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { TenantStatus } from '../tenants/entities/tenant.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      // Le decimos que extraiga el token del encabezado 'Authorization' como un Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // No ignorar si el token ha expirado
      ignoreExpiration: false,
      // Usa la misma clave secreta que para firmar el token
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Este método se ejecuta una vez que el token es validado
  async validate(payload: any) {
    // Cargamos al usuario FRESCO de la BD en cada request. El payload del JWT es
    // una foto del momento del login y puede tener hasta 30 dias de antiguedad.
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['tenant'],
    });

    // 👇 EL CANDADO: Verificamos si no existe o si fue inhabilitado 👇
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Acceso denegado o usuario inhabilitado.');
    }
    // 👆 ========================================================= 👆

    // La clinica suspendida/inactiva se bloquea en CADA request, no solo al login.
    if (!user.isSuperAdmin && user.tenant) {
      if (user.tenant.status === TenantStatus.INACTIVE) {
        throw new UnauthorizedException('La cuenta de esta clínica ha sido desactivada.');
      }
      if (user.tenant.status === TenantStatus.SUSPENDED) {
        throw new UnauthorizedException('El acceso para esta clínica ha sido suspendido. Por favor, contacte al soporte.');
      }
    }

    // Lo que retornamos aquí se adjuntará al objeto 'request' como 'request.user'.
    // role, tenantId, isSuperAdmin y tenantStatus salen de la BD (no del payload),
    // para que un cambio de rol o una suspension surtan efecto de inmediato.
    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      tenantId: user.tenant?.id ?? null,
      tenantName: user.tenant?.name ?? null,
      tenantStatus: user.tenant?.status ?? null,
    };
  }
}