import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { Repository } from 'typeorm';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as sharp from 'sharp';
// Importamos cliente R2 y comandos S3
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/r2.config'; 
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class TenantsService {

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  // --- HELPER: Subir Buffer a R2 ---
  private async uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key, // La ruta dentro del bucket
      Body: buffer,
      ContentType: mimeType,
      // Si R2 requiere caché o headers adicionales, se añaden aquí
    });
    
    // Enviamos el comando a R2
    await r2Client.send(command);
    
    // Devolvemos la URL pública
    return `${R2_PUBLIC_URL}/${key}`;
  }

  async updateLogo(tenantId: string, file: Express.Multer.File) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException('Clínica no encontrada.');
    if (!file) throw new BadRequestException('No se envió ningún archivo');

    try {
      // 1. Procesar imagen con SHARP (en memoria)
      const processedBuffer = await sharp(file.buffer)
        .resize({ width: 200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // 2. Definir ruta en la nube
      const fileName = `logo_${Date.now()}.webp`;
      const cloudPath = `tenants/${tenantId}/logo/${fileName}`;

      // 3. Subir a R2
      const publicUrl = await this.uploadToR2(processedBuffer, cloudPath, 'image/webp');

      // 4. Borrar el logo ANTIGUO de R2 (si existe)
      if (tenant.logoUrl && tenant.logoUrl.startsWith(R2_PUBLIC_URL)) {
        try {
          // Extraemos la clave (Key) del archivo desde la URL pública
          let oldKey = tenant.logoUrl.replace(R2_PUBLIC_URL, '');
          if (oldKey.startsWith('/')) oldKey = oldKey.substring(1);

          const deleteCommand = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: oldKey
          });
          await r2Client.send(deleteCommand);
          console.log(`Logo antiguo (${oldKey}) eliminado de R2.`);
        } catch (deleteError) {
          console.warn('No se pudo eliminar el logo antiguo de R2:', deleteError);
        }
      }

      // 5. Actualizar base de datos con la nueva URL de R2
      await this.tenantRepository.update(tenantId, { logoUrl: publicUrl });
      
      return { logoUrl: publicUrl };

    } catch (error) {
      console.error('Error actualizando logo en R2:', error);
      throw new InternalServerErrorException('Error al procesar o subir la imagen del logo.');
    }
  }

  async updateProfile(tenantId: string, dto: UpdateTenantDto) {
    // Si el DTO trae los nuevos campos (domainSlug, websiteConfig), se actualizarán aquí automáticamente
    await this.tenantRepository.update(tenantId, dto);
    return this.tenantRepository.findOneBy({ id: tenantId });
  }

  // --- NUEVO MÉTODO: Buscar por Slug (Para sitio web público) ---
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ 
      where: { domainSlug: slug } 
    });
  }
}