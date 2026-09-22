import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * ============================================================================
 * DATASOURCE PARA EL CLI DE TYPEORM (migraciones)
 *
 * Este archivo lo usa SOLO la linea de comandos (migration:generate / run /
 * revert). La aplicacion sigue configurandose en app.module.ts.
 *
 * Reglas:
 *  - synchronize SIEMPRE en false. TypeORM no debe tocar el esquema por su
 *    cuenta: cada cambio pasa por una migracion revisable y reversible.
 *  - Las entidades se cargan por glob para no tener que mantener la lista a
 *    mano (a diferencia de app.module.ts, donde hoy estan enumeradas).
 * ============================================================================
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // Rutas relativas a ESTE archivo y con doble extension, para que el mismo
  // datasource sirva en desarrollo (src/*.ts con ts-node) y en produccion,
  // donde la imagen solo contiene dist/*.js y no existe ts-node.
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  synchronize: false,
  migrationsTableName: 'migrations',
});
