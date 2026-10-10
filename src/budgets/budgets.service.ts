import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { Budget, BudgetStatus } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Branch } from '../branches/entities/branch.entity';
import { Product } from '../inventory/entities/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType } from '../inventory/entities/stock-movement.entity';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Treatment)
    private readonly treatmentRepository: Repository<Treatment>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemRepository: Repository<BudgetItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    // Para que un producto cobrado en el presupuesto salga del stock.
    private readonly inventoryService: InventoryService,
  ) {}

  async create(
    createBudgetDto: CreateBudgetDto,
    currentUser: any,
    branchId: string | null,
  ) {
    const tenantId = currentUser.tenantId;

    // El presupuesto se emite desde una sede concreta: de ahi salen luego la
    // caja y los reportes por sucursal. En vista consolidada hay que elegir.
    if (!branchId) {
      throw new BadRequestException(
        'Selecciona una sede para emitir el presupuesto.',
      );
    }
    
    // CORRECCIÓN: El token de seguridad guarda el ID de usuario en 'sub', no en 'id'.
    // Si el usuario es doctor, tomará su propio ID correctamente desde 'currentUser.sub'.
    // Quien esta operando. Se guarda aparte porque assignedDoctorId puede
    // acabar siendo OTRO usuario (el doctor al que se le asigna el plan), y en
    // el kardex tiene que figurar quien saco el producto de verdad.
    const actorId = currentUser.id || currentUser.sub;

    let assignedDoctorId = currentUser.id || currentUser.sub; 

    // --- NUEVA LÓGICA DE ROLES ---
    // Si el usuario es asistente o admin, verificamos a qué doctor se lo asignó
    if (currentUser.role === 'assistant' || currentUser.role === 'admin') {
      // Necesitamos as any para evitar error de TypeScript si doctorId es opcional en DTO
      if (!(createBudgetDto as any).doctorId) {
        throw new BadRequestException('El asistente o administrador debe seleccionar un doctor para este presupuesto.');
      }
      assignedDoctorId = (createBudgetDto as any).doctorId;
    }
    
    // Validamos que por ningún motivo el presupuesto se guarde sin doctor
    if (!assignedDoctorId) {
        throw new BadRequestException('No se pudo identificar al doctor tratante. Por favor inicie sesión nuevamente.');
    }
    // -----------------------------

    // 1. Extraer todos los campos, incluyendo los nuevos de ortodoncia
    const { 
      patientId, 
      items: itemsDto, 
      discountAmount = 0,
      isOrthodontic = false,
      orthoType,
      baseTreatmentCost = 0,
      initialPayment = 0,
      installments = 0,
      monthlyPayment = 0
    } = createBudgetDto as any;

    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // 2. Calcular el total de los ITEMS (Tratamientos/Aparatología)
    let itemsTotal = 0;
    const budgetItems: BudgetItem[] = [];
    /**
     * Productos que hay que sacar del stock. Se anotan mientras se validan las
     * lineas y se descuentan DESPUES de guardar el presupuesto, para que cada
     * movimiento del kardex nazca apuntando a su presupuesto.
     */
    const salidasDeStock: { product: Product; quantity: number }[] = [];

    for (const itemDto of itemsDto) {
      // Una linea es un tratamiento O un producto, nunca las dos cosas ni
      // ninguna. Se avisa aqui en lugar de dejar que la rechace el CHECK de la
      // base, que daria un error que no dice nada.
      if (!!itemDto.treatmentId === !!itemDto.productId) {
        throw new BadRequestException(
          'Cada linea del presupuesto debe ser un tratamiento o un producto.',
        );
      }

      const quantity = Math.max(1, Math.round(Number(itemDto.quantity)));

      if (itemDto.productId) {
        // Se busca dentro de la clinica: un id de otra clinica no existe aqui.
        const product = await this.productRepository.findOneBy({
          id: itemDto.productId,
          tenant: { id: tenantId },
        });
        if (!product) {
          throw new NotFoundException('Producto no encontrado.');
        }
        if (!product.isSellable) {
          throw new BadRequestException(
            `"${product.name}" no esta marcado como vendible, asi que no tiene precio de venta.`,
          );
        }

        // Igual que con los tratamientos: se congela el precio del momento. Si
        // no viene, se toma el del catalogo.
        const price =
          itemDto.priceAtTimeOfBudget !== undefined
            ? Number(itemDto.priceAtTimeOfBudget)
            : Number(product.salePrice);

        itemsTotal += price * quantity;

        budgetItems.push(
          this.budgetItemRepository.create({
            product,
            treatment: null,
            quantity,
            priceAtTimeOfBudget: price,
            // Un producto se entrega y ya: no se presta en sesiones.
            sessionsTotal: 1,
          }),
        );
        salidasDeStock.push({ product, quantity });
        continue;
      }

      const treatment = await this.treatmentRepository.findOneBy({ id: itemDto.treatmentId, tenant: { id: tenantId } });
      if (treatment) {
        // Usamos el precio enviado desde el frontend si existe (para congelar el precio), o el actual
        const price = itemDto.priceAtTimeOfBudget !== undefined ? Number(itemDto.priceAtTimeOfBudget) : Number(treatment.price);

        itemsTotal += price * quantity;

        // Lo que indique el especialista para ESTE paciente. No se hereda de
        // ningun valor del catalogo: el numero de sesiones es demasiado
        // variable para fijarlo en el servicio.
        const sessionsTotal = Math.max(1, Number(itemDto.sessionsTotal ?? 1));

        const newBudgetItem = this.budgetItemRepository.create({
          treatment,
          product: null,
          quantity: quantity,
          priceAtTimeOfBudget: price,
          sessionsTotal,
        });
        budgetItems.push(newBudgetItem);
      }
    }

    // 3. Calcular el TOTAL GENERAL
    let totalAmount = itemsTotal;

    // Si es ortodoncia, sumamos el Costo Base (Honorarios) a los items
    if (isOrthodontic) {
      totalAmount += Number(baseTreatmentCost);
    }

    // 4. Calcular Monto Final con Descuento
    const discount = Number(discountAmount) || 0;
    const finalAmount = Math.max(0, totalAmount - discount);

    // 5. Crear la entidad con TODOS los datos
    const newBudget = this.budgetRepository.create({
      patient,
      tenant: { id: tenantId },
      branch: { id: branchId } as Branch,
      doctor: { id: assignedDoctorId }, // <-- USAMOS EL DOCTOR RESUELTO POR LA LÓGICA
      totalAmount,
      discountAmount: discount,
      finalAmount,
      items: budgetItems,
      // Campos de Ortodoncia
      isOrthodontic,
      orthoType,
      baseTreatmentCost: Number(baseTreatmentCost),
      initialPayment: Number(initialPayment),
      installments: Number(installments),
      monthlyPayment: Number(monthlyPayment),
    });

    // Guardar y descontar van JUNTOS en una transaccion: si no hay stock
    // suficiente de un producto, no debe quedar un presupuesto a medias que
    // cobre algo que nunca salio del almacen.
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(newBudget);

      for (const { product, quantity } of salidasDeStock) {
        await this.inventoryService.registerExit(manager, {
          product,
          branchId,
          tenantId,
          quantity,
          userId: actorId,
          // Es una venta al paciente, aunque se cobre dentro del presupuesto.
          type: StockMovementType.SALE,
          referenceType: 'budget',
          referenceId: saved.id,
        });
      }

      return saved;
    });
  }

  async findAllForPatient(patientId: string, tenantId: string, doctorId?: string) {
    const whereCondition: any = {
      patient: { id: patientId },
      tenant: { id: tenantId },
    };
    if (doctorId) {
      whereCondition.doctor = { id: doctorId };
    }

    return this.budgetRepository.find({
      where: whereCondition,
      relations: ['items', 'items.treatment', 'items.product', 'doctor'],
      order: { creationDate: 'DESC' },
    });
  }

  async updateStatus(budgetId: string, tenantId: string, newStatus: BudgetStatus) {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    budget.status = newStatus;
    
    return this.budgetRepository.save(budget);
  }

  // Permite actualizar el descuento y recalcular el monto final
  async updateDiscount(budgetId: string, tenantId: string, discountAmount: number) {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    budget.discountAmount = Number(discountAmount) || 0;

    // Recalcular total si es necesario (seguridad)
    // Si por alguna razón totalAmount estuviera en 0 o corrupto, lo reconstruimos
    if (!budget.totalAmount || Number(budget.totalAmount) === 0) {
      const loaded = await this.budgetRepository.findOne({
        where: { id: budgetId, tenant: { id: tenantId } },
        relations: ['items'],
      });
      
      if (loaded) {
        let subtotalItems = 0;
        for (const it of loaded.items) {
          subtotalItems += Number(it.priceAtTimeOfBudget) * Number(it.quantity);
        }
        
        // CORRECCIÓN: Si es ortodoncia, sumar el costo base al recalcular
        if (loaded.isOrthodontic) {
           budget.totalAmount = subtotalItems + Number(loaded.baseTreatmentCost || 0);
        } else {
           budget.totalAmount = subtotalItems;
        }
      }
    }

    budget.finalAmount = Math.max(0, Number(budget.totalAmount) - Number(budget.discountAmount));

    return this.budgetRepository.save(budget);
  }

  async remove(budgetId: string, tenantId: string, userId: string) {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId, tenant: { id: tenantId } },
      relations: ['items'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    // Lo que salio del almacen por este presupuesto vuelve al stock. Se lee
    // del kardex, asi que si no habia productos no hace nada, y si se llama
    // dos veces no duplica existencias.
    await this.dataSource.transaction(async (manager) => {
      await this.inventoryService.reverseExits(manager, {
        referenceType: 'budget',
        referenceId: budgetId,
        tenantId,
        userId,
      });
      await manager.remove(budget);
    });
    return;
  }

  async findOne(id: string, tenantId: string) {
    const budget = await this.budgetRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['patient', 'tenant', 'items', 'items.treatment', 'items.product', 'doctor'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${id}" not found.`);
    }
    return budget;
  }
}