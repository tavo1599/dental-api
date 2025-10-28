import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv'; // Usamos dotenv para cargar variables de entorno

config(); // Carga las variables del archivo .env

// ¡IMPORTANTE!
// Copia tu configuración de TypeOrmModule.forRoot(...) de tu app.module.ts
// y pégala aquí. Debe ser casi idéntica.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres', // O 'mysql', 'mariadb', etc.
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Apunta a todas tus entidades
  // Esta ruta funciona para .ts (desarrollo) y .js (producción)
  entities: [__dirname + '/**/*.entity{.ts,.js}'], 
  
  // Apunta a tus archivos de migración
  migrations: [__dirname + '/migrations/*{.ts,.js}'], 

  // Otras opciones que puedas tener (ej. ssl, logging)
  // logging: true,
  // synchronize: false, // ¡IMPORTANTE! Synchronize debe ser false para usar migraciones
};

// Exportamos la instancia de DataSource
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;