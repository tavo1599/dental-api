import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LocationsService {
  private readonly baseUrl = 'https://free.e-api.net.pe/ubigeos.json';

  constructor(private readonly httpService: HttpService) {}

  async getDepartments() {
    const url = `${this.baseUrl}/departamentos`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async getProvinces(departmentId: string) {
    const url = `${this.baseUrl}/provincias/${departmentId}`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async getDistricts(provinceId: string) {
    const url = `${this.baseUrl}/distritos/${provinceId}`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }
}