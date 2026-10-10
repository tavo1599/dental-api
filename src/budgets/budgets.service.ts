import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { Budget, BudgetStatus } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { BudgetItemSupply } from './entities/budget-item-supply.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Branch } from '../branches/entities/branch.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { usesSessions } from '../tenants/specialty';
import { Product } from '../inventory/entities/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType } from '../inventory/entities/stock-movement.entity';
import { TreatmentSuppliesService } from '../inventory/treatment-supplies.service';

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
    // Para descontar los insumos que gasta cada tratamiento.
    private readonly suppliesService: TreatmentSuppliesService,
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

    /*
     * Los insumos por tratamiento son de ESTETICA y PSICOLOGIA.
     *
     * En odontologia no se ofrecen -ni la receta en el catalogo, ni el ajuste
     * al presupuestar- asi que un presupuesto dental no toca el almacen por
     * este concepto y se guarda igual que siempre. Lo que si descuenta en
     * cualquier rubro es un PRODUCTO cobrado como linea, que es otra cosa.
     *
     * Se lee el rubro de la base y no del token: un token de hace dias puede
     * traer el rubro anterior si el super admin lo cambio.
     */
    const clinica = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
      select: { id: true, specialty: true },
    });
    const usaInsumos = usesSessions(clinica?.specialty);

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

        /*
         * Insumos de ESTA linea. Si no vienen, se deja sin filas y al
         * descontar se usa la receta del catalogo; si vienen, mandan ellos y
         * la receta no se toca.
         *
         * Se valida que el producto sea de la clinica: un id de otra no
         * existe aqui.
         */
        /*
         * Insumos de ESTA linea.
         *
         * La linea guarda SIEMPRE lo que va a gastar: si el especialista no
         * ajusto nada, se copia la receta del catalogo del momento. Asi queda
         * registrado lo que se gasto de verdad aunque la receta cambie
         * despues, y la pantalla puede mostrarlo sin tener que recomponerlo.
         */
        const supplies: BudgetItemSupply[] = [];
        const vistos = new Set<string>();
        const fuente = !usaInsumos
          ? [] // en dental no hay insumos por tratamiento
          : Array.isArray(itemDto.supplies)
            ? itemDto.supplies
            : (await this.suppliesService.findForTreatment(treatment.id, tenantId)).map(
                (r: any) => ({ productId: r.product.id, quantity: Number(r.quantity) }),
              );

        for (const linea of fuente) {
          if (vistos.has(linea.productId)) {
            throw new BadRequestException(
              'Hay un insumo repetido en un tratamiento. Suma las cantidades en una sola linea.',
            );
          }
          vistos.add(linea.productId);

          // Se busca dentro de la clinica: un id de otra no existe aqui.
          const insumo = await this.productRepository.findOneBy({
            id: linea.productId,
            tenant: { id: tenantId },
          });
          if (!insumo) {
            throw new NotFoundException('Insumo no encontrado.');
          }
          supplies.push({
            product: insumo,
            quantity: Number(linea.quantity),
            tenant: { id: tenantId },
          } as BudgetItemSupply);
        }

        const newBudgetItem = this.budgetItemRepository.create({
          treatment,
          product: null,
          quantity: quantity,
          priceAtTimeOfBudget: price,
          sessionsTotal,
          supplies,
          // Decididos: a partir de aqui manda la linea, aunque no gaste nada.
          // En dental se deja sin marcar: la linea queda igual que antes de
          // que esto existiera.
          suppliesResolved: usaInsumos,
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

      /*
       * INSUMOS DE LOS TRATAMIENTOS
       *
       * Se descuentan aqui los de las lineas de UNA sola sesion. Las de varias
       * sesiones se descuentan sesion por sesion, al registrarlas, que es
       * cuando se gastan de verdad; hacerlo tambien aqui las contaria dos
       * veces.
       *
       * Hasta ahora el unico momento en que se descontaban insumos era
       * registrar una sesion, y las sesiones solo existen en psicologia y
       * estetica con mas de una. Resultado: en una clinica dental la receta no
       * descontaba NUNCA nada, y era pura decoracion.
       *
       * No corta si no alcanza: se avisa. Bloquear un presupuesto por una caja
       * de guantes dejaria a la clinica sin poder trabajar.
       */
      const avisos: string[] = [];
      for (const item of saved.items ?? []) {
        if (!usaInsumos) break; // en dental no se descuenta nada por este concepto
        if (!item.treatment || Number(item.sessionsTotal) > 1) continue;
        const reporte = await this.suppliesService.consumeForTreatment(
          {
            treatmentId: item.treatment.id,
            budgetItemId: item.id,
            tenantId,
            branchId,
            userId: actorId,
            referencia: { type: 'budget', id: saved.id },
            // Dos veces el mismo tratamiento gasta el doble de insumos.
            factor: Number(item.quantity) || 1,
          },
          manager,
        );
        if (reporte.warning) avisos.push(reporte.warning);
      }

      // Se devuelve pegado al presupuesto para que la interfaz lo muestre sin
      // tener que preguntar por separado.
      return Object.assign(saved, {
        stockWarning: avisos.length ? avisos.join(' ') : null,
      });
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
      relations: ['items', 'items.treatment', 'items.product', 'items.supplies', 'items.supplies.product', 'doctor'],
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
      relations: ['patient', 'tenant', 'items', 'items.treatment', 'items.product', 'items.supplies', 'items.supplies.product', 'doctor'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${id}" not found.`);
    }
    return budget;
  }
}