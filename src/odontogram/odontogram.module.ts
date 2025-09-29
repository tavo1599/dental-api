import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OdontogramController } from './odontogram.controller';
import { OdontogramService } from './odontogram.service';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';
import { Tooth } from './entities/tooth.entity'; // Importa la nueva entidad

@Module({
  imports: [TypeOrmModule.forFeature([ToothSurfaceState, Tooth])], // <-- Añade 'Tooth'
  controllers: [OdontogramController],
  providers: [OdontogramService],
})
export class OdontogramModule {}