import { Controller, Post, Param, UploadedFile, UseInterceptors, UseGuards, Req, Get, Body, Delete, HttpCode, HttpStatus} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { SignConsentDto } from './dto/sign-consent.dto';
import { Roles } from '../auth/decorators/roles.decorator'; // <-- Importa Roles
import { UserRole } from '../users/entities/user.entity'; // <-- Importa UserRole
import { RolesGuard } from '../auth/guards/roles.guard';

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

  @Post('sign-consent')
  @UseGuards(AuthGuard('jwt'))
  async signConsent(@Body() signConsentDto: SignConsentDto, @Req() req) {
    const { patientId, templateId, signatureBase64 } = signConsentDto;
    return this.documentsService.createSignedConsent(
      patientId,
      req.user.tenantId,
      req.user, // Pasamos el objeto 'user' completo
      templateId,
      signatureBase64,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSISTANT) // Solo Admin o Asistente pueden borrar
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    return this.documentsService.remove(id, req.user.tenantId);
  }

}