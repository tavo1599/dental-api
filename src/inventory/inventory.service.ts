import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Product } from './entities/product.entity';
import { ProductStock } from './entities/product-stock.entity';
import { ProductLot } from './entities/product-lot.entity';
import {
  StockMovement,
  StockMovementType,
} from './entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateMovementDto } from './dto/create-movement.dto';

/** Fecha local en formato 'YYYY-MM-DD', sin pasar por UTC. */
function toIsoDay(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}

/** Movimientos que restan existencias. */
const OUTBOUND = new Set([
  StockMovementType.SALE,
  StockMovementType.TREATMENT_USE,
  StockMovementType.LOSS,
]);

@Injectable()
export class InventoryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductStock)
    private readonly stockRepository: Repository<ProductStock>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(ProductLot)
    private readonly lotRepository: Repository<ProductLot>,
  ) {}

  // =========================================================================
  // CATALOGO  (es de la clinica, no de la sede)
  // =========================================================================

  create(dto: CreateProductDto, tenantId: string) {
    if (dto.isSellable && (dto.salePrice ?? 0) <= 0) {
      throw new BadRequestException(
        'Un producto a la venta necesita un precio mayor a cero.',
      );
    }
    const product = this.productRepository.create({
      ...dto,
      tenant: { id: tenantId } as Tenant,
    });
    return this.productRepository.save(product);
  }

  /**
   * Catalogo con las existencias de UNA sede. Si branchId es null (admin en
   * vista consolidada) devuelve el stock sumado de todas las sucursales.
   */
  async findAll(
    tenantId: string,
    branchId: string | null,
    filters?: { onlySellable?: boolean; onlyConsumable?: boolean; search?: string },
  ) {
    const qb = this.productRepository
      .createQueryBuilder('p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."isActive" = true');

    if (filters?.onlySellable) qb.andWhere('p."isSellable" = true');
    if (filters?.onlyConsumable) qb.andWhere('p."isConsumable" = true');
    if (filters?.search) {
      qb.andWhere('(p.name ILIKE :s OR p.sku ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }

    const products = await qb.orderBy('p.name', 'ASC').getMany();
    if (products.length === 0) return [];

    const stocks = await this.stockRepository.find({
      where: {
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['product'],
    });

    const byProduct = new Map<string, number>();
    for (const s of stocks) {
      const current = byProduct.get(s.product.id) ?? 0;
      byProduct.set(s.product.id, current + Number(s.quantity));
    }

    return products.map((p) => {
      const stock = byProduct.get(p.id) ?? 0;
      return {
        ...p,
        stock,
        isLowStock: Number(p.minStock) > 0 && stock <= Number(p.minStock),
      };
    });
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.productRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado en esta clínica.');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string) {
    const product = await this.findOne(id, tenantId);
    const merged = this.productRepository.merge(product, dto);
    if (merged.isSellable && Number(merged.salePrice) <= 0) {
      throw new BadRequestException(
        'Un producto a la venta necesita un precio mayor a cero.',
      );
    }
    return this.productRepository.save(merged);
  }

  /** Los productos no se borran: se desactivan, para no romper el kardex. */
  async deactivate(id: string, tenantId: string) {
    const product = await this.findOne(id, tenantId);
    product.isActive = false;
    await this.productRepository.save(product);
    return { message: `Producto "${product.name}" desactivado.` };
  }

  // =========================================================================
  // KARDEX  (siempre por sede)
  // =========================================================================

  /**
   * Registra un movimiento y actualiza las existencias de la sede EN LA MISMA
   * TRANSACCION. Si algo falla, no queda ni el movimiento ni el stock movido.
   */
  async registerMovement(
    dto: CreateMovementDto,
    tenantId: string,
    branchId: string | null,
    userId: string,
  ) {
    if (!branchId) {
      throw new BadRequestException(
        'Selecciona una sede para registrar el movimiento de inventario.',
      );
    }
    if (Number(dto.quantity) <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero.');
    }

    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: dto.productId, tenant: { id: tenantId } },
      });
      if (!product) {
        throw new NotFoundException('Producto no encontrado en esta clínica.');
      }

      const signed = this.signedQuantity(dto.type, Number(dto.quantity));
      const stock = await this.lockStockRow(
        manager,
        product.id,
        branchId,
        tenantId,
      );

      const balanceAfter = Number(stock.quantity) + signed;
      if (balanceAfter < 0) {
        throw new BadRequestException(
          `Stock insuficiente de "${product.name}" en esta sede. ` +
            `Disponible: ${Number(stock.quantity)}, solicitado: ${Math.abs(signed)}.`,
        );
      }

      stock.quantity = balanceAfter;
      await manager.save(stock);

      // Las entradas van a un lote concreto; las salidas se descargan por FEFO.
      const lot =
        signed > 0
          ? await this.addToLot(manager, product.id, branchId, tenantId, signed, dto)
          : await this.consumeFefo(manager, product, branchId, Math.abs(signed));

      // Una compra actualiza el costo de referencia del producto.
      if (dto.type === StockMovementType.PURCHASE && Number(dto.unitCost) > 0) {
        product.cost = Number(dto.unitCost);
        await manager.save(product);
      }

      const movement = manager.create(StockMovement, {
        product: { id: product.id } as Product,
        branch: { id: branchId } as Branch,
        tenant: { id: tenantId } as Tenant,
        type: dto.type,
        quantity: signed,
        unitCost: dto.unitCost ?? 0,
        balanceAfter,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
        notes: dto.notes ?? null,
        lot,
        user: { id: userId } as any,
      });
      return manager.save(movement);
    });
  }

  /** Historial de movimientos de un producto en la sede activa. */
  findMovements(
    productId: string,
    tenantId: string,
    branchId: string | null,
    limit = 100,
  ) {
    return this.movementRepository.find({
      where: {
        product: { id: productId },
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['user', 'branch'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Lotes vencidos o proximos a vencer en la sede activa.
   *
   * Es lo que evita la perdida por caducidad: el doctor ve con antelacion que
   * lote se le va a vencer y puede usarlo primero o darlo de baja a tiempo.
   * Se ignoran los lotes agotados y los que no caducan.
   */
  async findExpiring(tenantId: string, branchId: string | null, days = 60) {
    // Todo el calculo se hace sobre fechas locales en formato 'YYYY-MM-DD',
    // que es exactamente como las guarda Postgres en una columna `date`.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limiteDate = new Date(hoy);
    limiteDate.setDate(limiteDate.getDate() + days);
    const limite = toIsoDay(limiteDate);

    const lots = await this.lotRepository.find({
      where: {
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['product', 'branch'],
      order: { expiryDate: 'ASC' },
    });

    return lots
      .filter(
        (lot) =>
          lot.expiryDate !== null &&
          Number(lot.quantity) > 0 &&
          lot.expiryDate.slice(0, 10) <= limite,
      )
      .map((lot) => {
        const [y, m, d] = (lot.expiryDate as string)
          .slice(0, 10)
          .split('-')
          .map(Number);
        // Se construye en hora LOCAL (no UTC) para que el conteo de dias no
        // se desplace por la zona horaria.
        const expiry = new Date(y, m - 1, d);
        const diasRestantes = Math.round(
          (expiry.getTime() - hoy.getTime()) / 86400000,
        );
        return {
          id: lot.id,
          productId: lot.product.id,
          productName: lot.product.name,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          quantity: Number(lot.quantity),
          unit: lot.product.unit,
          branchName: lot.branch?.name ?? null,
          diasRestantes,
          // Vencido ya, o a punto de vencer (dos semanas).
          isExpired: diasRestantes < 0,
          isCritical: diasRestantes >= 0 && diasRestantes <= 14,
        };
      });
  }

  /** Desglose de lotes de un producto en la sede activa. */
  findLots(productId: string, tenantId: string, branchId: string | null) {
    return this.lotRepository.find({
      where: {
        product: { id: productId },
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['branch'],
      order: { expiryDate: 'ASC' },
    });
  }

  /** Productos por debajo de su minimo en la sede activa. */
  async findLowStock(tenantId: string, branchId: string | null) {
    const all = await this.findAll(tenantId, branchId);
    return all.filter((p) => p.isLowStock);
  }

  // =========================================================================
  // INTERNOS
  // =========================================================================

  /**
   * Mete una entrada en su lote. Si ya existe un lote con el mismo numero y la
   * misma caducidad, se acumula ahi en vez de crear uno nuevo: dos compras del
   * mismo lote son el mismo lote.
   */
  private async addToLot(
    manager: EntityManager,
    productId: string,
    branchId: string,
    tenantId: string,
    quantity: number,
    dto: CreateMovementDto,
  ): Promise<ProductLot> {
    const lotNumber = dto.lotNumber?.trim() || null;
    // Sin new Date(): la fecha viaja como 'YYYY-MM-DD' de punta a punta.
    const expiryDate = dto.expiryDate?.slice(0, 10) || null;

    const qb = manager
      .createQueryBuilder(ProductLot, 'l')
      .setLock('pessimistic_write')
      .where('l."productId" = :productId', { productId })
      .andWhere('l."branchId" = :branchId', { branchId });

    // IS NULL no se puede expresar con igualdad: hay que distinguir el caso.
    if (lotNumber) qb.andWhere('l."lotNumber" = :lotNumber', { lotNumber });
    else qb.andWhere('l."lotNumber" IS NULL');

    if (expiryDate) qb.andWhere('l."expiryDate" = :expiryDate', { expiryDate });
    else qb.andWhere('l."expiryDate" IS NULL');

    const existing = await qb.getOne();
    if (existing) {
      existing.quantity = Number(existing.quantity) + quantity;
      return manager.save(existing);
    }

    return manager.save(
      manager.create(ProductLot, {
        product: { id: productId } as Product,
        branch: { id: branchId } as Branch,
        tenant: { id: tenantId } as Tenant,
        lotNumber,
        expiryDate,
        quantity,
      }),
    );
  }

  /**
   * Descarga una salida por FEFO: primero lo que antes caduca.
   *
   * El orden es `expiryDate ASC NULLS LAST`, de modo que un lote sin fecha
   * (un cepillo, unas pinzas) nunca desplaza a uno que si caduca. Una salida
   * puede repartirse entre varios lotes; se devuelve el primero que se toco,
   * que es el que queda enlazado al movimiento.
   */
  async consumeFefo(
    manager: EntityManager,
    product: Product,
    branchId: string,
    quantity: number,
  ): Promise<ProductLot | null> {
    const lots = await manager
      .createQueryBuilder(ProductLot, 'l')
      .setLock('pessimistic_write')
      .where('l."productId" = :productId', { productId: product.id })
      .andWhere('l."branchId" = :branchId', { branchId })
      .andWhere('l."quantity" > 0')
      .orderBy('l."expiryDate"', 'ASC', 'NULLS LAST')
      .addOrderBy('l."createdAt"', 'ASC')
      .getMany();

    let pendiente = quantity;
    let primero: ProductLot | null = null;

    for (const lot of lots) {
      if (pendiente <= 0) break;
      const disponible = Number(lot.quantity);
      const usar = Math.min(disponible, pendiente);

      lot.quantity = disponible - usar;
      await manager.save(lot);

      if (!primero) primero = lot;
      pendiente -= usar;
    }

    if (pendiente > 0) {
      // No deberia ocurrir: el saldo de ProductStock ya se valido antes. Si
      // pasa, es que stock y lotes se han desincronizado, y es mejor abortar
      // la transaccion que seguir descuadrando el inventario.
      throw new BadRequestException(
        `Los lotes de "${product.name}" no cubren la salida en esta sede. ` +
          `Faltan ${pendiente}. Revisa el inventario con un ajuste.`,
      );
    }

    return primero;
  }

  private signedQuantity(type: StockMovementType, quantity: number): number {
    if (type === StockMovementType.ADJUSTMENT) {
      // El ajuste puede sumar o restar; el signo viene del propio valor.
      return quantity;
    }
    return OUTBOUND.has(type) ? -Math.abs(quantity) : Math.abs(quantity);
  }

  /**
   * Devuelve la fila de existencias BLOQUEADA (SELECT ... FOR UPDATE), o la
   * crea si es la primera vez que ese producto se mueve en esa sede.
   *
   * El bloqueo es lo que evita que dos ventas simultaneas del mismo producto
   * lean el mismo saldo y dejen el stock descuadrado.
   */
  private async lockStockRow(
    manager: EntityManager,
    productId: string,
    branchId: string,
    tenantId: string,
  ): Promise<ProductStock> {
    const existing = await manager
      .createQueryBuilder(ProductStock, 's')
      .setLock('pessimistic_write')
      .where('s."productId" = :productId', { productId })
      .andWhere('s."branchId" = :branchId', { branchId })
      .getOne();

    if (existing) return existing;

    const created = manager.create(ProductStock, {
      product: { id: productId } as Product,
      branch: { id: branchId } as Branch,
      tenant: { id: tenantId } as Tenant,
      quantity: 0,
    });
    return manager.save(created);
  }
}
