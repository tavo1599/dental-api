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

  // --- CONFIGURACIÓN CORS DINÁMICA ---
  // Reemplaza al app.enableCors() básico para permitir subdominios
  app.enableCors({
    origin: (requestOrigin, callback) => {
      // 1. Permitir peticiones sin origen (como Postman o Server-to-Server)
      if (!requestOrigin) return callback(null, true);

      // 2. Definir los dominios permitidos
      // Acepta: sonriandes.com, app.sonriandes.com, y CUALQUIER subdominio (*.sonriandes.com)
      // También acepta localhost para desarrollo
      const allowedDomains = [
        /^https:\/\/(.*\.)?sonriandes\.com$/, // Regex para dominios de producción
        /^http:\/\/localhost:\d+$/            // Desarrollo local
      ];

      const isAllowed = allowedDomains.some(regex => regex.test(requestOrigin));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`Bloqueado por CORS: ${requestOrigin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Permitir cookies/headers de autorización
  });
  // -----------------------------------

  app.useGlobalPipes(new ValidationPipe());

  // --- ELIMINADO: app.useStaticAssets ---
  // Ya no servimos la carpeta 'uploads' localmente.
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();