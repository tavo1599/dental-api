import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cie10Code } from './entities/cie10-code.entity';
import { Cie10Controller } from './cie10.controller';
import { Cie10Service } from './cie10.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cie10Code])], // <-- Cambiamos HttpModule por esto
  controllers: [Cie10Controller],
  providers: [Cie10Service],
})
export class Cie10Module {}