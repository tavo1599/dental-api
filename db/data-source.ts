import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config(); // Carga las variables de .env

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/db/migrations/*.js'],
  // --- LÍNEA AÑADIDA ---
  // Habilita SSL para conexiones a bases de datos en la nube como Render
  ssl: {
    rejectUnauthorized: false,
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;