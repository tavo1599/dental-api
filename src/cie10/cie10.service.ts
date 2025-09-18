import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Cie10Code } from './entities/cie10-code.entity';
import { Cie10CodeDto } from './dto/cie10-code.dto';

@Injectable()
export class Cie10Service {
  private readonly logger = new Logger(Cie10Service.name);

  constructor(
    @InjectRepository(Cie10Code)
    private readonly cie10Repository: Repository<Cie10Code>,
  ) {}

  async search(term: string) {
    this.logger.log(`Buscando localmente el término "${term}"...`);

    if (!term) {
      const results = await this.cie10Repository.find({ order: { code: 'ASC' } });
      this.logger.log(`Término vacío, devolviendo ${results.length} resultados.`);
      return results;
    }

    if (term.length < 2) {
      return [];
    }
    
    const results = await this.cie10Repository.find({
      where: [
        { description: ILike(`%${term}%`) },
        { code: ILike(`%${term}%`) }
      ],
      take: 10,
    });

    this.logger.log(`Se encontraron ${results.length} resultados.`);
    return results;
  }

  // --- MÉTODOS QUE FALTABAN ---

  async create(dto: Cie10CodeDto): Promise<Cie10Code> {
    const newCode = this.cie10Repository.create(dto);
    return this.cie10Repository.save(newCode);
  }

  async update(id: string, dto: Cie10CodeDto): Promise<Cie10Code> {
    const code = await this.cie10Repository.preload({
      id,
      ...dto,
    });
    if (!code) {
      throw new NotFoundException(`Código CIE-10 con ID "${id}" no encontrado.`);
    }
    return this.cie10Repository.save(code);
  }

  async remove(id: string): Promise<void> {
    const result = await this.cie10Repository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Código CIE-10 con ID "${id}" no encontrado.`);
    }
  }
}