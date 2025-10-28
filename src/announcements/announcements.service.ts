import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
  ) {}

  async findActive(): Promise<Announcement | null> {
    // Busca el último anuncio que tenga el estado 'isActive' en true
    return this.announcementRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' }, // Ordena para obtener el más reciente
    });
  }
}