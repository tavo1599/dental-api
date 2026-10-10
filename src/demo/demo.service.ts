import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

// ====================================================================
// ZONA DE IMPORTS
// ====================================================================
import { Patient } from '../patients/entities/patient.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Budget, BudgetStatus } from '../budgets/entities/budget.entity';
import { BudgetItem } from '../budgets/entities/budget-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';

import { Tooth } from '../odontogram/entities/tooth.entity';
import { ToothSurfaceState } from '../odontogram/entities/tooth-surface-state.entity';
import { ToothState } from '../odontogram/entities/tooth-state.entity'; // <-- NUEVO: Para Extracciones/Ausentes
import { DentalBridge } from '../odontogram/entities/dental-bridge.entity'; // <-- NUEVO: Para Puentes
import { ToothStatus } from '../types/tooth-status.enum';
import { OdontogramRecordType } from '../odontogram/enums/record-type.enum';
import { faker } from '@faker-js/faker';
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Appointment) private apptRepo: Repository<Appointment>,
    @InjectRepository(Budget) private budgetRepo: Repository<Budget>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tooth) private toothRepo: Repository<Tooth>,
    @InjectRepository(ToothSurfaceState) private surfaceRepo: Repository<ToothSurfaceState>,
  ) {}

  /**
   * SEED: Llena la clínica con 25 pacientes, 40 citas y presupuestos.
   * Renombrado de seedDemoClinic a seed para coincidir con el controlador.
   */
  async seed(tenantId: string) {
    const tenant = await this.tenantRepo.findOneBy({ id: tenantId });
    if (!tenant) throw new NotFoundException('Clínica no encontrada');

    const doctor = await this.userRepo.findOne({ 
      where: { tenant: { id: tenantId }, role: UserRole.DENTIST } 
    });

    if (!doctor) return 'Error: Primero crea un usuario Doctor en esta clínica.';

    /*
     * La sede es OBLIGATORIA en citas y presupuestos desde que se abrio el
     * modulo de sucursales. Sin ella, sembrar datos fallaba con un error de la
     * base y la herramienta quedaba inservible.
     */
    const manager = this.patientRepo.manager;
    const branch = await manager.findOne(Branch, {
      where: { tenant: { id: tenantId }, isMain: true },
    });
    if (!branch) {
      return 'Error: la clínica no tiene sede principal. Créala antes de sembrar datos.';
    }

    // Para que los presupuestos lleven detalle y no un total sin explicacion.
    const treatments = await manager.find(Treatment, {
      where: { tenant: { id: tenantId } },
      take: 20,
    });

    this.logger.log(`Sembrando datos de prueba para: ${tenant.name}`);

    // 1. Crear Pacientes (con birthDate para evitar error 500)
    const patients = [];
    for (let i = 0; i < 25; i++) {
      const p = this.patientRepo.create({
        fullName: faker.person.fullName(),
        dni: faker.string.numeric(8),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        birthDate: faker.date.birthdate(),
        tenant,
      });
      patients.push(await this.patientRepo.save(p));
    }

    // 2. Crear datos de Odontograma para los primeros 10 pacientes
    for (let i = 0; i < 10; i++) {
      const patient = patients[i];
      // Registramos una caries (rojo) en el inicial
      await this.toothRepo.save(this.toothRepo.create({
        toothNumber: 18, status: ToothStatus.CARIES, patient, tenant, recordType: OdontogramRecordType.INITIAL
      }));
      // Registramos una resina curada (verde) en evolución
      await this.surfaceRepo.save(this.surfaceRepo.create({
        toothNumber: 18, surface: 'occlusal', status: ToothStatus.FILLED_EVOLVED, patient, tenant, recordType: OdontogramRecordType.EVOLUTION
      }));
    }

    // 3. Crear Citas en horario laboral (7am - 7pm)
    for (let i = 0; i < 40; i++) {
      const start = faker.date.between({ from: '2026-04-01', to: '2026-05-30' });
      
      // FORZAR HORARIOS: Entre 7:00 AM y 6:00 PM (Para que termine máximo a las 7:00 PM)
      const hour = faker.number.int({ min: 7, max: 18 });
      const minute = faker.helpers.arrayElement([0, 30]);
      start.setHours(hour, minute, 0, 0);

      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora después

      await this.apptRepo.save(this.apptRepo.create({
        startTime: start,
        endTime: end,
        status: faker.helpers.arrayElement([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]),
        patient: faker.helpers.arrayElement(patients),
        doctor,
        tenant,
        branch,
      }));
    }

    // 4. Crear Presupuestos para el Dashboard
    for (let i = 0; i < 15; i++) {
      /*
       * El total se calcula DESDE las lineas, no al reves.
       *
       * Antes se sembraba un importe al azar y ningun item, asi que el
       * presupuesto se imprimia sin detalle y su total no cuadraba con nada.
       * Si la clinica aun no tiene catalogo de tratamientos, el importe va al
       * costo base de un plan de ortodoncia, que si es una forma valida de
       * presupuesto con total y sin lineas.
       */
      const elegidos = treatments.length
        ? faker.helpers.arrayElements(treatments, Math.min(treatments.length, faker.number.int({ min: 1, max: 3 })))
        : [];

      const items = elegidos.map((t) =>
        manager.create(BudgetItem, {
          treatment: t,
          product: null,
          quantity: faker.number.int({ min: 1, max: 2 }),
          priceAtTimeOfBudget: Number(t.price) || faker.number.int({ min: 80, max: 600 }),
          sessionsTotal: 1,
        }),
      );

      const itemsTotal = items.reduce(
        (suma, it) => suma + Number(it.priceAtTimeOfBudget) * Number(it.quantity),
        0,
      );
      const baseTreatmentCost = items.length ? 0 : faker.number.int({ min: 200, max: 3500 });
      const amount = itemsTotal + baseTreatmentCost;

      await this.budgetRepo.save(this.budgetRepo.create({
        patient: faker.helpers.arrayElement(patients),
        doctor,
        tenant,
        branch,
        items,
        totalAmount: amount,
        finalAmount: amount,
        baseTreatmentCost,
        isOrthodontic: baseTreatmentCost > 0,
        status: BudgetStatus.APPROVED,
        creationDate: faker.date.past(),
      }));
    }

    return `¡Éxito! Clínica ${tenant.name} lista para la demo.`;
  }

  /**
   * RESET: Borra todo lo creado arriba pero deja la clínica (tenant) intacta.
   * Renombrado de clearClinicData a reset para coincidir con el controlador.
   */
  async reset(tenantId: string) {
    this.logger.warn(`Iniciando limpieza profunda de la clínica: ${tenantId}`);

    try {
      // TODO en UNA transaccion. Antes iba por pasos sueltos, y si uno fallaba
      // los anteriores ya estaban confirmados: la clinica se quedaba a medias
      // -presupuestos sin sus lineas, con su total intacto- y esos
      // presupuestos huerfanos se imprimian sin ningun detalle.
      await this.patientRepo.manager.transaction(async (manager) => {
        const pacientes = `SELECT id FROM patients WHERE "tenantId" = $1`;

        /*
         * Los historiales se borran a mano porque su llave foranea es NO
         * ACTION: no caen solos con el paciente. Son los unicos asi; el resto
         * -odontograma, citas, presupuestos, sesiones, documentos- es CASCADE.
         *
         * Psicologia y estetica van en la lista: se anadieron al abrir el
         * sistema a otros rubros y se habian quedado fuera, asi que resetear
         * un consultorio de psicologia fallaba SIEMPRE al llegar a los
         * pacientes, despues de haber borrado todo lo anterior.
         */
        const historiales = [
          'medical_histories',
          'odontopediatric_histories',
          'orthodontic_histories',
          'psychology_histories',
          'aesthetic_histories',
        ];
        for (const tabla of historiales) {
          await manager.query(
            `DELETE FROM ${tabla} WHERE "patientId" IN (${pacientes})`,
            [tenantId],
          );
        }

        // El odontograma no cuelga del paciente sino de la clinica, asi que no
        // cae por cascada y hay que pedirlo.
        await manager.delete(ToothSurfaceState, { tenant: { id: tenantId } });
        await manager.delete(Tooth, { tenant: { id: tenantId } });
        await manager.delete(ToothState, { tenant: { id: tenantId } });
        await manager.delete(DentalBridge, { tenant: { id: tenantId } });

        await manager.delete(Appointment, { tenant: { id: tenantId } });

        // Basta con borrar el presupuesto: sus lineas y sus pagos son CASCADE,
        // y las sesiones cuelgan de las lineas. Borrarlas a mano antes era lo
        // que dejaba presupuestos sin detalle cuando algo fallaba despues.
        await manager.delete(Budget, { tenant: { id: tenantId } });

        await manager.delete(Patient, { tenant: { id: tenantId } });

        /*
         * Las VENTAS no se borran. Su paciente queda en nulo -la llave es SET
         * NULL- y pasan a figurar como publico general. Es deliberado: una
         * venta cobrada es un apunte de caja, y borrarla descuadraria el
         * cierre y el kardex del inventario, que no son datos de demostracion.
         */
      });

      return 'Limpieza completa. La clínica está como nueva.';
    } catch (error: any) {
      this.logger.error('Falló la limpieza de la clínica:', error);
      throw new InternalServerErrorException(
        `Restricción de Base de Datos detectada: ${error.message}`
      );
    }
  }
}