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
   * Descuenta stock de la sede y deja el movimiento en el kardex.
   *
   * La mecanica (bloqueo de fila, reparto FEFO y apunte) vive en el modulo de
   * inventario, que es quien manda sobre las existencias. Antes estaba copiada
   * aqui, con lo que cualquier arreglo habia que hacerlo en dos sitios.
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
    await this.inventoryService.registerExit(manager, {
      product,
      branchId,
      tenantId,
      quantity,
      userId,
      type: StockMovementType.SALE,
      referenceType: 'sale',
      referenceId: saleId,
    });
  }

  /**
   * Anula una venta y devuelve el stock.
   *
   * La venta NO se borra: se marca anulada y queda en el listado. Borrarla se
   * llevaria por delante el apunte de caja y los movimientos de inventario, y
   * manana nadie sabria por que las existencias no cuadran. Lo que se deshace
   * es el efecto: las unidades vuelven al stock y, si se habia cobrado, se
   * registra la devolucion del dinero.
   *
   * La devolucion del dinero lleva la fecha de HOY, no la de la venta. Si
   * llevara la original, anular una venta de la semana pasada cambiaria un
   * cierre de caja ya cerrado; asi el dinero sale el dia que sale de verdad.
   */
  async cancel(
    id: string,
    tenantId: string,
    branchId: string | null,
    userId: string,
    reason?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, {
        where: {
          id,
          tenant: { id: tenantId },
          ...(branchId ? { branch: { id: branchId } } : {}),
        },
        relations: ['items', 'items.product', 'branch'],
      });
      if (!sale) {
        throw new NotFoundException('Venta no encontrada.');
      }
      if (sale.status === SaleStatus.CANCELLED) {
        throw new BadRequestException('Esta venta ya esta anulada.');
      }

      // Lo que vuelve al stock se LEE del kardex, no se recalcula de la venta:
      // asi la devolucion coincide con lo que de verdad salio.
      const devueltas = await this.inventoryService.reverseExits(manager, {
        referenceType: 'sale',
        referenceId: sale.id,
        tenantId,
        userId,
      });

      // El dinero: se devuelve cada cobro con su mismo medio de pago, para que
      // lo cobrado en efectivo salga del efectivo y no de la tarjeta.
      const cobros = await manager.find(Payment, {
        where: { sale: { id: sale.id }, tenant: { id: tenantId } },
      });
      const neto = cobros.reduce((suma, p) => suma + Number(p.amount), 0);
      if (neto > 0) {
        const hoy = new Date();
        for (const cobro of cobros) {
          const monto = Number(cobro.amount);
          if (monto <= 0) continue;
          await manager.save(
            manager.create(Payment, {
              amount: -monto,
              paymentDate: hoy,
              paymentMethod: cobro.paymentMethod,
              notes: `Devolucion por anulacion de la venta N° ${sale.number}`,
              budget: null,
              sale: { id: sale.id } as Sale,
              registeredBy: { id: userId } as any,
              tenant: { id: tenantId } as Tenant,
              branch: { id: (sale.branch as any).id } as Branch,
            }),
          );
        }
      }

      sale.status = SaleStatus.CANCELLED;
      const motivo = reason?.trim();
      sale.notes = [sale.notes, motivo ? `ANULADA: ${motivo}` : 'ANULADA']
        .filter(Boolean)
        .join(' | ');
      await manager.save(sale);

      return {
        id: sale.id,
        number: sale.number,
        status: sale.status,
        unitsReturned: devueltas,
        amountRefunded: neto > 0 ? Number(neto.toFixed(2)) : 0,
      };
    });
  }
}
