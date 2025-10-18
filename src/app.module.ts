import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Tenant } from './tenants/entities/tenant.entity';
import { User } from './users/entities/user.entity';
import { PatientsModule } from './patients/patients.module';
import { Patient } from './patients/entities/patient.entity';
import { ClinicalHistoryModule } from './clinical-history/clinical-history.module'; // <-- 1. Importa el módulo
import { ClinicalHistoryEntry } from './clinical-history/entities/clinical-history-entry.entity'; // <-- 2. Importa la entidad
import { AppointmentsModule } from './appointments/appointments.module';
import { Appointment } from './appointments/entities/appointment.entity';
import { OdontogramModule } from './odontogram/odontogram.module';
import { ToothSurfaceState } from './odontogram/entities/tooth-surface-state.entity'; // <-- Importa la entidad
import { TreatmentsModule } from './treatments/treatments.module';
import { Treatment } from './treatments/entities/treatment.entity';
import { BudgetsModule } from './budgets/budgets.module';
import { Budget } from './budgets/entities/budget.entity';
import { BudgetItem } from './budgets/entities/budget-item.entity';
import { PaymentsModule } from './payments/payments.module';
import { Payment } from './payments/entities/payment.entity';
import { ServeStaticModule } from '@nestjs/serve-static'; // <-- Importa esto
import { join } from 'path'; // <-- Importa esto
import { DocumentsModule } from './documents/documents.module';
import { PatientDocument } from './documents/entities/patient-document.entity';
import { PeriodontogramModule } from './periodontogram/periodontogram.module'; // <-- Importa el módulo de periodontograma  
import { PeriodontalMeasurement } from './periodontogram/entities/periodontal-measurement.entity'; // <-- Importa la entidad de medición periodontal
import { Prescription } from './prescriptions/entities/prescription.entity'; // <-- Importa la entidad de receta médica
import { PrescriptionsModule } from './prescriptions/prescriptions.module'; // <-- Importa
import { ExpensesModule } from './expenses/expenses.module';
import { Expense } from './expenses/entities/expense.entity'; // <-- Importa la entidad de gasto
import { CashManagementModule } from './cash-management/cash-management.module'; // <-- Importa el módulo de gestión de caja
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { AuditLog } from './audit/entities/audit.entity'; // <-- Importa la entidad de auditoría
import { DashboardModule } from './dashboard/dashboard.module';
import { LocationsModule } from './locations/locations.module';
import { UtilsModule } from './utils/utils.module';
import { MailModule } from './mail/mail.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { Announcement } from './announcements/entities/announcement.entity'; // <-- Importa la entidad de anuncio
import { Cie10Module } from './cie10/cie10.module';
import { Cie10Code } from './cie10/entities/cie10-code.entity'; // <-- Importa la entidad de código CIE-10
import { PlannedTreatment } from './planned-treatments/entities/planned-treatment.entity';
import { PlannedTreatmentsModule } from './planned-treatments/planned-treatments.module';
import { ConsentTemplate } from './consent-templates/entities/consent-template.entity';
import { ConsentTemplatesModule } from './consent-templates/consent-templates.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { Tooth } from './odontogram/entities/tooth.entity';
import { MedicalHistory } from './patients/entities/medical-history.entity';
import { OdontopediatricHistory } from './patients/entities/odontopediatric-history.entity';


@Module({
  imports: [
    // Carga las variables de entorno del archivo .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Configura la conexión a la base de datos de forma ASÍNCRONA
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [Tenant, User, Patient, ClinicalHistoryEntry, Appointment, ToothSurfaceState, Treatment, Budget, BudgetItem, Payment, PatientDocument, PeriodontalMeasurement, Prescription, Expense, AuditLog, Announcement, Cie10Code, PlannedTreatment, ConsentTemplate, Tooth, MedicalHistory, OdontopediatricHistory],
        synchronize: true, // ¡Solo para desarrollo!
      }),
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/', // Sirve los archivos desde la raíz
    }),

    // Importa todos los módulos
    TenantsModule,
    UsersModule,
    AuthModule,
    PatientsModule,
    ClinicalHistoryModule,
    AppointmentsModule,
    OdontogramModule,
    TreatmentsModule,
    BudgetsModule,
    PaymentsModule,
    DocumentsModule,
    PeriodontogramModule,
    PrescriptionsModule,
    ExpensesModule,
    CashManagementModule,
    ReportsModule,
    AuditModule,
    DashboardModule,
    LocationsModule,
    UtilsModule,
    MailModule, // <-- Añade el módulo de correo
    SuperAdminModule, // <-- Añade el módulo de SuperAdmin
    AnnouncementsModule, // <-- Añade el módulo de anuncios
    Cie10Module,
    PlannedTreatmentsModule,
    ConsentTemplatesModule,
    GoogleCalendarModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}