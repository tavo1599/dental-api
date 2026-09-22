import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Product } from '../inventory/entities/product.entity';
import { ProductStock } from '../inventory/entities/product-stock.entity';
import {
  StockMovement,
  StockMovementType,
} from '../inventory/entities/stock-movement.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Sale, SaleStatus } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    // Se reutiliza el FEFO del modulo de inventario a proposito: duplicar esa
    // logica aqui haria que los dos caminos se desincronizaran con el tiempo.
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Registra una venta completa. TODO ocurre en una sola transaccion:
   * correlativo, venta, lineas, descuento de stock, kardex y cobro. Si
   * cualquier paso falla (p.ej. un producto sin stock), no queda absolutamente
   * nada a medias: ni la venta, ni el stock movido, ni el pago.
   */
  async create(
    dto: CreateSaleDto,
    tenantId: string,
    branchId: string | null,
    userId: string,
  ) {
    if (!branchId) {
      throw new BadRequestException(
        'Selecciona una sede para registrar la venta.',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException('La venta debe tener al menos un producto.');
    }

    return this.dataSource.transaction(async (manager) => {
      const number = await this.nextSaleNumber(manager, branchId);

      const patient = await this.resolvePatient(manager, dto, tenantId);

      const items: SaleItem[] = [];
      const validated: { product: Product; quantity: number }[] = [];
      let subtotal = 0;

      for (const line of dto.items) {
        const product = await manager.findOne(Product, {
          where: { id: line.productId, tenant: { id: tenantId } },
        });
        if (!product) {
          throw new NotFoundException(
            `Producto ${line.productId} no encontrado en esta clínica.`,
          );
        }
        if (!product.isSellable) {
          throw new BadRequestException(
            `"${product.name}" no está marcado como producto de venta.`,
          );
        }
        if (Number(line.quantity) <= 0) {
          throw new BadRequestException(
            `La cantidad de "${product.name}" debe ser mayor a cero.`,
          );
        }

        // El precio se congela al momento de vender: si maniana sube, esta
        // venta no cambia.
        const unitPrice = line.unitPrice ?? Number(product.salePrice);
        const lineSubtotal = Number((unitPrice * Number(line.quantity)).toFixed(2));
        subtotal += lineSubtotal;

        items.push(
          manager.create(SaleItem, {
            product: { id: product.id } as Product,
            quantity: line.quantity,
            unitPrice,
            subtotal: lineSubtotal,
          }),
        );
        validated.push({ product, quantity: Number(line.quantity) });
      }

      subtotal = Number(subtotal.toFixed(2));
      const discount = Number(dto.discountAmount ?? 0);
      if (discount < 0 || discount > subtotal) {
        throw new BadRequestException(
          'El descuento no puede ser negativo ni mayor al subtotal.',
        );
      }
      const total = Number((subtotal - discount).toFixed(2));

      const sale = manager.create(Sale, {
        number,
        patient,
        customerName: dto.customerName ?? null,
        customerDocument: dto.customerDocument ?? null,
        subtotal,
        discountAmount: discount,
        total,
        status: SaleStatus.COMPLETED,
        notes: dto.notes ?? null,
        items,
        soldBy: { id: userId } as any,
        branch: { id: branchId } as Branch,
        tenant: { id: tenantId } as Tenant,
      });
      const saved = await manager.save(sale);

      // El stock se descuenta con la venta ya guardada, para que cada movimiento
      // del kardex nazca apuntando a SU venta. Sigue todo en la misma
      // transaccion: si un producto no tiene stock, la venta entera se revierte.
      for (const { product, quantity } of validated) {
        await this.discountStock(
          manager,
          product,
          branchId,
          tenantId,
          quantity,
          userId,
          saved.id,
        );
      }

      // El cobro entra por la MISMA tabla de pagos que los tratamientos, para
      // que el cierre de caja siga siendo una sola consulta.
      if (dto.payment) {
        if (Number(dto.payment.amount) <= 0) {
          throw new BadRequestException('El monto cobrado debe ser mayor a cero.');
        }
        if (Number(dto.payment.amount) > total + 0.01) {
          throw new BadRequestException(
            `El cobro (S/. ${dto.payment.amount}) excede el total de la venta (S/. ${total}).`,
          );
        }
        const payment = manager.create(Payment, {
          amount: dto.payment.amount,
          paymentDate: new Date(),
          paymentMethod: dto.payment.method,
          budget: null,
          sale: { id: saved.id } as Sale,
          registeredBy: { id: userId } as any,
          tenant: { id: tenantId } as Tenant,
          branch: { id: branchId } as Branch,
        });
        await manager.save(payment);
      }

      return manager.findOne(Sale, {
        where: { id: saved.id },
        relations: ['items', 'items.product', 'patient', 'soldBy', 'branch'],
      });
    });
  }

  findAll(
    tenantId: string,
    branchId: string | null,
    range?: { from?: string; to?: string },
  ) {
    const where: any = { tenant: { id: tenantId } };
    if (branchId) where.branch = { id: branchId };
    if (range?.from && range?.to) {
      where.createdAt = Between(
        new Date(`${range.from}T00:00:00.000-05:00`),
        new Date(`${range.to}T23:59:59.999-05:00`),
      );
    }

    return this.saleRepository.find({
      where,
      relations: ['items', 'items.product', 'patient', 'branch'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async findOne(id: string, tenantId: string, branchId: string | null) {
    const sale = await this.saleRepository.findOne({
      where: {
        id,
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['items', 'items.product', 'patient', 'soldBy', 'branch'],
    });
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    return sale;
  }

  // =========================================================================
  // INTERNOS
  // =========================================================================

  /**
   * Correlativo por sede. Se bloquea la fila de la sede para serializar la
   * numeracion: sin el bloqueo, dos cajeros vendiendo a la vez obtendrian el
   * mismo numero y el indice unico rechazaria una de las dos ventas.
   */
  private async nextSaleNumber(
    manager: EntityManager,
    branchId: string,
  ): Promise<number> {
    await manager
      .createQueryBuilder(Branch, 'b')
      .setLock('pessimistic_write')
      .where('b.id = :branchId', { branchId })
      .getOne();

    const row = await manager
      .createQueryBuilder(Sale, 's')
      .select('COALESCE(MAX(s.number), 0)', 'max')
      .where('s."branchId" = :branchId', { branchId })
      .getRawOne<{ max: string }>();

    return Number(row?.max ?? 0) + 1;
  }

  private async resolvePatient(
    manager: EntityManager,
    dto: CreateSaleDto,
    tenantId: string,
  ): Promise<Patient | null> {
    if (!dto.patientId) return null;
    const patient = await manager.findOne(Patient, {
      where: { id: dto.patientId, tenant: { id: tenantId } },
    });
    if (!patient) {
      throw new NotFoundException('El paciente no pertenece a esta clínica.');
    }
    return patient;
  }

  /**
   * Descuenta stock de la sede y deja el movimiento en el kardex. Reutiliza el
   * mismo bloqueo de fila que el modulo de inventario para que dos ventas
   * simultaneas del mismo producto no descuadren las existencias.
   */
  private async discountStock(
    manager: EntityManager,
    product: Product,
    branchId: string,
    tenantId: string,
    quantity: number,
    userId: string,
    saleId: string,
  ) {
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

    const balanceAfter = Number(stock.quantity) - quantity;
    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Stock insuficiente de "${product.name}" en esta sede. ` +
          `Disponible: ${Number(stock.quantity)}, solicitado: ${quantity}.`,
      );
    }

    stock.quantity = balanceAfter;
    await manager.save(stock);

    // Sale primero lo que antes caduca.
    const lot = await this.inventoryService.consumeFefo(
      manager,
      product,
      branchId,
      quantity,
    );

    await manager.save(
      manager.create(StockMovement, {
        product: { id: product.id } as Product,
        branch: { id: branchId } as Branch,
        tenant: { id: tenantId } as Tenant,
        type: StockMovementType.SALE,
        quantity: -quantity,
        unitCost: product.cost ?? 0,
        balanceAfter,
        referenceType: 'sale',
        referenceId: saleId,
        lot,
        user: { id: userId } as any,
      }),
    );
  }
}
