import { Controller, Post, Param, UploadedFile, UseInterceptors, UseGuards, Req, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';

@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:patientId')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/documents',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}-${file.originalname}`);
      },
    }),
  }))
  uploadFile(
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.documentsService.saveDocument(file, patientId, req.user.tenantId);
  }

  @Get('patient/:patientId')
  findAllForPatient(@Param('patientId') patientId: string, @Req() req) {
    return this.documentsService.findAllForPatient(patientId, req.user.tenantId);
  }
}