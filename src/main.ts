import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SocketIoAdapter } from './socket-io.adapter';

async function bootstrap() {
  // Mantenemos el tipo NestExpressApplication por si necesitas acceder a métodos específicos de Express en el futuro,
  // aunque ya no usamos useStaticAssets.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // Configura CORS correctamente para producción si es necesario
  app.enableCors();

  app.useGlobalPipes(new ValidationPipe());

  // --- ELIMINADO: app.useStaticAssets ---
  // Ya no servimos la carpeta 'uploads' localmente.
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();