import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    // Branch lo necesita BranchContextGuard. El resto de entidades que toca el
    // servicio (productos, stock, kardex, pagos) se manejan via EntityManager
    // dentro de la transaccion, asi que no hace falta registrarlas aqui.
    TypeOrmModule.forFeature([Sale, SaleItem, Branch]),
    InventoryModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
