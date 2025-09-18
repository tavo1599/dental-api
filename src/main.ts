// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './socket-io.adapter'; // <-- 1. Importa nuestro nuevo adaptador

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- 2. Usa nuestro adaptador personalizado ---
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();