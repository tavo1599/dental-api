import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientDocument } from './entities/patient-document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientDocument, Patient]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads', // Carpeta raíz de subidas
        filename: (req, file, cb) => {
          // Genera un nombre de archivo único
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}