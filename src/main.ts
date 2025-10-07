import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SocketIoAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useWebSocketAdapter(new SocketIoAdapter(app));

  app.enableCors();

  // --- CONFIGURACIÓN DE VALIDACIÓN SIMPLIFICADA ---
  // Usamos el ValidationPipe sin las opciones estrictas
  app.useGlobalPipes(new ValidationPipe());
  // --- FIN DE LA CORRECIÓN ---

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/',
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();