import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UtilsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async lookupDni(dni: string) {
    const token = this.configService.get<string>('DNI_API_TOKEN');
    const url = `https://api.apis.net.pe/v1/dni?numero=${dni}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Referer': 'https://apis.net.pe/api-consulta-dni',
          },
        }),
      );
      // Combinamos los nombres para crear el nombre completo
      const { nombres, apellidoPaterno, apellidoMaterno } = response.data;
      return {
        fullName: `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim(),
      };
    } catch (error) {
      throw new Error('DNI no encontrado o error en la API externa.');
    }
  }
}