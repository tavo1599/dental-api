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
    // 1. Buscamos la clínica para obtener la ruta del logo antiguo
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) {
      // Borra el archivo subido si la clínica no existe
      await fs.unlink(file.path);
      throw new NotFoundException('Clínica no encontrada.');
    }
    const oldLogoUrl = tenant.logoUrl;

    try {
      // 2. Procesamos la nueva imagen
      const webpFilename = `${file.filename.split('.')[0]}.webp`;
      const webpPath = path.join(file.destination, webpFilename);

      await sharp(file.path)
        .resize({ width: 200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(webpPath);
      
      // 3. Borramos el archivo original temporal (ej. el .png subido)
      await fs.unlink(file.path);

      // 4. Actualizamos la base de datos con la nueva ruta
      const newLogoUrl = `/logos/${webpFilename}`;
      await this.tenantRepository.update(tenantId, { logoUrl: newLogoUrl });
      
      // 5. Si existía un logo antiguo, lo borramos del disco
      if (oldLogoUrl) {
        const oldLogoFilePath = path.join('./uploads', oldLogoUrl);
        // Usamos un try/catch aquí por si el archivo ya no existe por alguna razón
        try {
          await fs.unlink(oldLogoFilePath);
        } catch (error) {
          console.warn(`No se pudo eliminar el logo antiguo: ${oldLogoFilePath}`);
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