import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Product } from './entities/product.entity';
import { ProductStock } from './entities/product-stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { ProductLot } from './entities/product-lot.entity';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [
    // Branch lo necesita BranchContextGuard para validar el acceso a la sede.
    TypeOrmModule.forFeature([
      Product,
      ProductStock,
      StockMovement,
      ProductLot,
      Branch,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
