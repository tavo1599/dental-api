import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { Repository } from 'typeorm';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async updateLogo(tenantId: string, file: Express.Multer.File) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) {
      await fs.unlink(file.path);
      throw new NotFoundException('Clínica no encontrada.');
    }
    const oldLogoUrl = tenant.logoUrl;

    try {
      const webpFilename = `${file.filename.split('.')[0]}.webp`;
      const webpPath = path.join(file.destination, webpFilename);

      await sharp(file.path)
        .resize({ width: 200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(webpPath);
      
      await fs.unlink(file.path);

      const newLogoUrl = `/logos/${webpFilename}`;
      await this.tenantRepository.update(tenantId, { logoUrl: newLogoUrl });
      
      if (oldLogoUrl) {
        // --- CORRECCIÓN CLAVE AQUÍ ---
        // Quitamos la barra inicial de la URL guardada
        const oldLogoRelativePath = oldLogoUrl.startsWith('/') ? oldLogoUrl.substring(1) : oldLogoUrl;
        const oldLogoFilePath = path.join(process.cwd(), 'uploads', oldLogoRelativePath);
        
        try {
          await fs.unlink(oldLogoFilePath);
          console.log(`Logo antiguo eliminado: ${oldLogoFilePath}`);
        } catch (error) {
          console.warn(`No se pudo eliminar el logo antiguo: ${oldLogoFilePath}`, error);
        }
      }
      
      return { logoUrl: newLogoUrl };

    } catch (error) {
      throw new InternalServerErrorException('Error al procesar la imagen.');
    }
  }


    async updateProfile(tenantId: string, dto: UpdateTenantDto) {
    await this.tenantRepository.update(tenantId, dto);
    return this.tenantRepository.findOneBy({ id: tenantId });
  }
}