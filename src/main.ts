import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SocketIoAdapter } from './socket-io.adapter';
const compression = require('compression');
// Mismo patron que compression: el tsconfig no tiene esModuleInterop.
const helmet = require('helmet');

async function bootstrap() {
  // Mantenemos el tipo NestExpressApplication por si necesitas acceder a métodos específicos de Express en el futuro,
  // aunque ya no usamos useStaticAssets.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(compression());

  // Cabeceras de seguridad HTTP (HSTS, noSniff, frameguard, etc.).
  app.use(helmet());

  // La API corre detras de un proxy inverso (el que termina TLS en
  // api.sonriandes.com). Sin esto, req.ip seria SIEMPRE la IP del proxy y el
  // rate limit contaria a todos los usuarios como si fueran uno solo.
  app.set('trust proxy', 1);

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

  // transform: true aplica los @Type() de los DTOs (ej. convertir "150.00" a 150).
  // NO activamos enableImplicitConversion para no alterar el resto de endpoints.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // --- ELIMINADO: app.useStaticAssets ---
  // Ya no servimos la carpeta 'uploads' localmente.
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();