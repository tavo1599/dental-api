import { Controller, Post, Param, UploadedFile, UseInterceptors, UseGuards, Req, Get, Body, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { SignConsentDto } from './dto/sign-consent.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { memoryStorage } from 'multer'; // <-- IMPORTANTE: Importamos memoryStorage explícitamente

@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:patientId')
  // --- CAMBIO CRÍTICO: Forzamos memoryStorage aquí ---
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage() // Esto garantiza que NO se guarde en disco
  })) 
  uploadFile(
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    // Verificación de seguridad: Si el buffer llega vacío, lanzamos error antes de subir
    if (!file || !file.buffer) {
      throw new Error('El archivo no se cargó correctamente en memoria.');
    }
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
      req.user,
      templateId,
      signatureBase64,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSISTANT)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    return this.documentsService.remove(id, req.user.tenantId);
  }
}