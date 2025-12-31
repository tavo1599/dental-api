import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
// IMPORTANTE: Importamos AMBOS controladores
import { TenantsController, PublicTenantsController } from './tenants.controller';
import { Tenant } from './entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  // IMPORTANTE: Agregamos PublicTenantsController al array de controllers
  controllers: [TenantsController, PublicTenantsController],
  providers: [TenantsService],
  exports: [TenantsService], // Exportamos por si otros módulos lo necesitan
})
export class TenantsModule {}