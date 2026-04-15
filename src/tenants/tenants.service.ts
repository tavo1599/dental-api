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

  /**
   * Helper privado para subir un buffer procesado a Cloudflare R2
   */
  private async uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key, 
      Body: buffer,
      ContentType: mimeType,
    });
    
    await r2Client.send(command);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  /**
   * Sube y actualiza el logotipo de la clínica
   */
  async updateLogo(tenantId: string, file: Express.Multer.File) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException('Clínica no encontrada.');
    if (!file) throw new BadRequestException('No se envió ningún archivo');

    try {
      const processedBuffer = await sharp(file.buffer)
        .resize({ width: 250, withoutEnlargement: true }) // Tamaño optimizado para web
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `logo_${Date.now()}.webp`;
      const cloudPath = `tenants/${tenantId}/logo/${fileName}`;

      const publicUrl = await this.uploadToR2(processedBuffer, cloudPath, 'image/webp');

      // Borrar el logo antiguo de R2 si existe para no acumular basura
      if (tenant.logoUrl && tenant.logoUrl.startsWith(R2_PUBLIC_URL)) {
        try {
          let oldKey = tenant.logoUrl.replace(R2_PUBLIC_URL, '');
          if (oldKey.startsWith('/')) oldKey = oldKey.substring(1);

          const deleteCommand = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: oldKey
          });
          await r2Client.send(deleteCommand);
        } catch (deleteError) {
          console.warn('No se pudo eliminar el logo antiguo de R2:', deleteError);
        }
      }

      await this.tenantRepository.update(tenantId, { logoUrl: publicUrl });
      return { logoUrl: publicUrl };

    } catch (error) {
      console.error('Error actualizando logo en R2:', error);
      throw new InternalServerErrorException('Error al procesar o subir la imagen del logo.');
    }
  }

  /**
   * Actualiza el perfil de la clínica y la configuración del sitio web (incluyendo servicios)
   */
  async updateProfile(tenantId: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException('Clínica no encontrada');

    // Usamos merge para combinar los datos nuevos (que incluyen websiteConfig con services)
    const updatedTenant = this.tenantRepository.merge(tenant, dto);
    
    // Guardamos la entidad completa. TypeORM se encarga de persistir el JSONB de websiteConfig
    await this.tenantRepository.save(updatedTenant);
    
    return updatedTenant;
  }

  /**
   * Busca una clínica por su slug (subdominio). 
   * Vital para cargar la Landing Page pública con sus doctores.
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ 
      where: { domainSlug: slug },
      relations: ['users'] // Cargamos los usuarios para mostrar el staff en la web
    });
  }
}