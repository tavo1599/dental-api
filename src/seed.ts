import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './users/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get(getRepositoryToken(User));

  console.log('Creando usuario Super Admin...');

  const superAdminEmail = 'gustavo089999@gmail.com'; // <-- CAMBIA ESTO
  const superAdminPassword = 'Ogremagic15.'; // <-- CAMBIA ESTO

  const existingAdmin = await userRepository.findOneBy({ email: superAdminEmail });

  if (existingAdmin) {
    console.log('El usuario Super Admin ya existe.');
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    const newSuperAdmin = userRepository.create({
      email: superAdminEmail,
      password_hash: hashedPassword,
      fullName: 'Super Administrador',
      role: UserRole.ADMIN,
      isSuperAdmin: true,
    });

    await userRepository.save(newSuperAdmin);
    console.log('¡Usuario Super Admin creado con éxito!');
  }

  await app.close();
}

bootstrap();