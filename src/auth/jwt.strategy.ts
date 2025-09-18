// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

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
    // El 'payload' es el objeto que pusimos en el token al hacer login
    // Podemos usarlo para hacer una última verificación, ej: si el usuario aún existe
    const user = await this.userRepository.findOneBy({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // Lo que retornamos aquí se adjuntará al objeto 'request' como 'request.user'
    return payload;
  }
}