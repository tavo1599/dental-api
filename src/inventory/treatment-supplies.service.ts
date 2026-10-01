import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TreatmentSupply } from './entities/treatment-supply.entity';
import { Product } from './entities/product.entity';
import { ProductStock } from './entities/product-stock.entity';
import {
  StockMovement,
  StockMovementType,
} from './entities/stock-movement.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Branch } from '../branches/entities/branch.entity';
import { InventoryService } from './inventory.service';

/** Lo que paso con un insumo al descontarlo, para poder avisar. */
export interface ConsumedSupply {
  productName: string;
  quantity: number;
  balanceAfter: number;
  /** true si el stock quedo en negativo: hay entradas sin registrar. */
  wentNegative: boolean;
}

export interface ConsumptionReport {
  consumed: ConsumedSupply[];
  /** Mensaje para la interfaz cuando algo quedo en negativo. */
  warning: string | null;
}

/**
 * ============================================================================
 * CONSUMO AUTOMATICO DE INSUMOS
 *
 * Cada tratamiento puede tener una receta: que insumos gasta y cuanto. Al
 * registrar una sesion se descuentan solos del stock de esa sede.
 *
 * Una decision importante: si NO hay stock suficiente, NO se bloquea. A una
 * clinica no se le puede decir "no puedes registrar la sesion que ya hiciste";
 * se registra, el stock queda en negativo y se avisa. Un negativo en el kardex
 * es una senal honesta de que falta registrar una compra, no un error que
 * haya que esconder.
 *
 * Es lo contrario que en una venta, donde si se bloquea: ahi la salida aun no
 * ha ocurrido y todavia se puede evitar vender lo que no hay.
 * ============================================================================
 */
@Injectable()
export class TreatmentSuppliesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TreatmentSupply)
    private readonly supplyRepository: Repository<TreatmentSupply>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Treatment)
    private readonly treatmentRepository: Repository<Treatment>,
    private readonly inventoryService: InventoryService,
  ) {}

  /** Receta de un tratamiento. */
  async findForTreatment(treatmentId: string, tenantId: string) {
    const treatment = await this.treatmentRepository.findOneBy({
      id: treatmentId,
      tenant: { id: tenantId },
    });
    if (!treatment) {
      throw new NotFoundException(
        'El tratamiento no existe o no pertenece a esta clínica.',
      );
    }

    return this.supplyRepository.find({
      where: { treatment: { id: treatmentId }, tenant: { id: tenantId } },
      relations: ['product'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Reemplaza la receta completa. Se manda la lista entera y no cambios
   * sueltos: asi la interfaz no tiene que llevar la cuenta de que se anadio y
   * que se quito.
   */
  async replaceForTreatment(
    treatmentId: string,
    tenantId: string,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    const treatment = await this.treatmentRepository.findOneBy({
      id: treatmentId,
      tenant: { id: tenantId },
    });
    if (!treatment) {
      throw new NotFoundException(
        'El tratamiento no existe o no pertenece a esta clínica.',
      );
    }

    // Un mismo producto dos veces en la receta es un error de la interfaz.
    const ids = items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Hay un insumo repetido en la receta. Súmalos en una sola línea.',
      );
    }

    if (ids.length) {
      const productos = await this.productRepository.find({
        where: { tenant: { id: tenantId } },
        select: { id: true, name: true, isConsumable: true, isActive: true },
      });
      const porId = new Map(productos.map((p) => [p.id, p]));

      for (const { productId, quantity } of items) {
        const p = porId.get(productId);
        if (!p) {
          throw new BadRequestException(
            'Alguno de los insumos no existe o no pertenece a esta clínica.',
          );
        }
        if (!p.isConsumable) {
          throw new BadRequestException(
            `"${p.name}" no está marcado como insumo. Márcalo como "Se consume en tratamientos" o quítalo de la receta.`,
          );
        }
        if (Number(quantity) <= 0) {
          throw new BadRequestException(
            `La cantidad de "${p.name}" debe ser mayor a cero.`,
          );
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(TreatmentSupply, {
        treatment: { id: treatmentId },
        tenant: { id: tenantId },
      });

      if (!items.length) return [];

      const nuevos = items.map((i) =>
        manager.create(TreatmentSupply, {
          treatment: { id: treatmentId } as Treatment,
          product: { id: i.productId } as Product,
          quantity: Number(i.quantity),
          tenant: { id: tenantId } as Tenant,
        }),
      );
      return manager.save(nuevos);
    });
  }

  /**
   * Descuenta del stock lo que consume un tratamiento.
   *
   * Se llama al registrar una sesion. Si el tratamiento no tiene receta no
   * hace nada y devuelve una lista vacia.
   */
  async consumeForTreatment(
    treatmentId: string,
    tenantId: string,
    branchId: string,
    userId: string,
    referencia: { type: string; id: string },
  ): Promise<ConsumptionReport> {
    const receta = await this.supplyRepository.find({
      where: { treatment: { id: treatmentId }, tenant: { id: tenantId } },
      relations: ['product'],
    });
    if (!receta.length) return { consumed: [], warning: null };

    const consumed = await this.dataSource.transaction(async (manager) => {
      const salidas: ConsumedSupply[] = [];
      for (const linea of receta) {
        if (!linea.product?.isActive) continue; // un insumo dado de baja se salta
        salidas.push(
          await this.moverStock(
            manager,
            linea.product,
            Number(linea.quantity),
            tenantId,
            branchId,
            userId,
            referencia,
            'salida',
          ),
        );
      }
      return salidas;
    });

    const negativos = consumed.filter((c) => c.wentNegative);
    return {
      consumed,
      warning: negativos.length
        ? `Quedó stock negativo de ${negativos
            .map((n) => `"${n.productName}"`)
            .join(', ')}. Revisa si falta registrar una compra.`
        : null,
    };
  }

  /**
   * Devuelve al stock lo que consumio un tratamiento.
   *
   * Se llama al deshacer una sesion: sin esto, cada correccion dejaria el
   * inventario descuadrado para siempre.
   */
  async returnForTreatment(
    treatmentId: string,
    tenantId: string,
    branchId: string,
    userId: string,
    referencia: { type: string; id: string },
  ): Promise<void> {
    const receta = await this.supplyRepository.find({
      where: { treatment: { id: treatmentId }, tenant: { id: tenantId } },
      relations: ['product'],
    });
    if (!receta.length) return;

    await this.dataSource.transaction(async (manager) => {
      for (const linea of receta) {
        if (!linea.product?.isActive) continue;
        await this.moverStock(
          manager,
          linea.product,
          Number(linea.quantity),
          tenantId,
          branchId,
          userId,
          referencia,
          'entrada',
        );
      }
    });
  }

  /**
   * Un movimiento de stock con su asiento en el kardex.
   *
   * Mismo mecanismo que usa una venta -bloqueo de la fila de stock y consumo
   * FEFO- salvo que aqui NO se corta cuando no alcanza.
   */
  private async moverStock(
    manager: EntityManager,
    product: Product,
    cantidad: number,
    tenantId: string,
    branchId: string,
    userId: string,
    referencia: { type: string; id: string },
    sentido: 'salida' | 'entrada',
  ): Promise<ConsumedSupply> {
    // Bloqueo de fila: dos sesiones simultaneas no deben leer el mismo saldo.
    let stock = await manager
      .createQueryBuilder(ProductStock, 's')
      .setLock('pessimistic_write')
      .where('s."productId" = :productId', { productId: product.id })
      .andWhere('s."branchId" = :branchId', { branchId })
      .getOne();

    if (!stock) {
      stock = await manager.save(
        manager.create(ProductStock, {
          product: { id: product.id } as Product,
          branch: { id: branchId } as Branch,
          tenant: { id: tenantId } as Tenant,
          quantity: 0,
        }),
      );
    }

    const signo = sentido === 'salida' ? -1 : 1;
    const balanceAfter = Number(stock.quantity) + signo * cantidad;
    stock.quantity = balanceAfter;
    await manager.save(stock);

    // En una salida sale primero lo que antes caduca. En una devolucion no se
    // reabre un lote: vuelve al saldo general, que es lo honesto cuando ya no
    // se sabe de que lote salio.
    const lot =
      sentido === 'salida'
        ? await this.inventoryService
            .consumeFefo(manager, product, branchId, cantidad)
            .catch(() => null)
        : null;

    await manager.save(
      manager.create(StockMovement, {
        product: { id: product.id } as Product,
        branch: { id: branchId } as Branch,
        tenant: { id: tenantId } as Tenant,
        type:
          sentido === 'salida'
            ? StockMovementType.TREATMENT_USE
            : StockMovementType.RETURN,
        quantity: signo * cantidad,
        unitCost: product.cost ?? 0,
        balanceAfter,
        referenceType: referencia.type,
        referenceId: referencia.id,
        lot,
        notes:
          sentido === 'entrada'
            ? 'Devolución por sesión eliminada'
            : 'Consumo automático por sesión registrada',
        user: { id: userId } as any,
      }),
    );

    return {
      productName: product.name,
      quantity: cantidad,
      balanceAfter,
      wentNegative: balanceAfter < 0,
    };
  }
}
