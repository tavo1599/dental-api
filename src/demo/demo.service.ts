import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

// ====================================================================
// ZONA DE IMPORTS
// ====================================================================
import { Patient } from '../patients/entities/patient.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Budget, BudgetStatus } from '../budgets/entities/budget.entity';
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
      }));
    }

    // 4. Crear Presupuestos para el Dashboard
    for (let i = 0; i < 15; i++) {
      const amount = faker.number.int({ min: 200, max: 3500 });
      await this.budgetRepo.save(this.budgetRepo.create({
        patient: faker.helpers.arrayElement(patients),
        doctor,
        tenant,
        totalAmount: amount,
        finalAmount: amount,
        status: BudgetStatus.APPROVED,
        isOrthodontic: faker.datatype.boolean(),
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
    const criteria = { tenant: { id: tenantId } };

    try {
      // 0. Borrado SQL Forzado para saltar restricciones de llaves foráneas en historiales
      await this.patientRepo.query(`DELETE FROM medical_histories WHERE "patientId" IN (SELECT id FROM patients WHERE "tenantId" = $1)`, [tenantId]);
      await this.patientRepo.query(`DELETE FROM odontopediatric_histories WHERE "patientId" IN (SELECT id FROM patients WHERE "tenantId" = $1)`, [tenantId]);
      await this.patientRepo.query(`DELETE FROM orthodontic_histories WHERE "patientId" IN (SELECT id FROM patients WHERE "tenantId" = $1)`, [tenantId]);

      // 1. Borramos Odontogramas
      await this.surfaceRepo.delete(criteria);
      await this.toothRepo.delete(criteria);
      
      // Usamos el manager para tablas que podrían no tener repo inyectado aquí
      await this.patientRepo.manager.delete(ToothState, criteria);
      await this.patientRepo.manager.delete(DentalBridge, criteria);

      // 2. Borramos Citas
      await this.apptRepo.delete(criteria);

      // 3. Borramos Presupuestos y sus Items de forma segura
      const budgets = await this.budgetRepo.find({ where: criteria, relations: ['items'] });
      for (const budget of budgets) {
          if (budget.items && budget.items.length > 0) {
              await this.budgetRepo.manager.remove(budget.items);
          }
      }
      if (budgets.length > 0) {
          await this.budgetRepo.remove(budgets);
      }

      // 4. Finalmente, borramos a los Pacientes
      await this.patientRepo.delete(criteria);

      return 'Limpieza completa. La clínica está como nueva.';
    } catch (error: any) {
      this.logger.error('Falló la limpieza de la clínica:', error);
      throw new InternalServerErrorException(
        `Restricción de Base de Datos detectada: ${error.message}`
      );
    }
  }
}