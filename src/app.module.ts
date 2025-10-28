import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { ClinicalHistoryModule } from './clinical-history/clinical-history.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { OdontogramModule } from './odontogram/odontogram.module';
import { TreatmentsModule } from './treatments/treatments.module';
import { BudgetsModule } from './budgets/budgets.module';
import { PaymentsModule } from './payments/payments.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DocumentsModule } from './documents/documents.module';
import { PeriodontogramModule } from './periodontogram/periodontogram.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CashManagementModule } from './cash-management/cash-management.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LocationsModule } from './locations/locations.module';
import { UtilsModule } from './utils/utils.module';
import { MailModule } from './mail/mail.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { Cie10Module } from './cie10/cie10.module';
import { PlannedTreatmentsModule } from './planned-treatments/planned-treatments.module';
import { ConsentTemplatesModule } from './consent-templates/consent-templates.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { OrthodonticAnamnesisModule } from './orthodontic-anamnesis/orthodontic-anamnesis.module';
import { Tenant } from './tenants/entities/tenant.entity';
import { User } from './users/entities/user.entity';
import { Patient } from './patients/entities/patient.entity';
import { ClinicalHistoryEntry } from './clinical-history/entities/clinical-history-entry.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { ToothSurfaceState } from './odontogram/entities/tooth-surface-state.entity';
import { Treatment } from './treatments/entities/treatment.entity';
import { Budget } from './budgets/entities/budget.entity';
import { BudgetItem } from './budgets/entities/budget-item.entity';
import { Payment } from './payments/entities/payment.entity';
import { PatientDocument } from './documents/entities/patient-document.entity';
import { PeriodontalMeasurement } from './periodontogram/entities/periodontal-measurement.entity';
import { Prescription } from './prescriptions/entities/prescription.entity';
import { Expense } from './expenses/entities/expense.entity';
import { AuditLog } from './audit/entities/audit.entity';
import { Announcement } from './announcements/entities/announcement.entity';
import { Cie10Code } from './cie10/entities/cie10-code.entity';
import { PlannedTreatment } from './planned-treatments/entities/planned-treatment.entity';
import { ConsentTemplate } from './consent-templates/entities/consent-template.entity';
import { Tooth } from './odontogram/entities/tooth.entity';
import { MedicalHistory } from './patients/entities/medical-history.entity';
import { OdontopediatricHistory } from './patients/entities/odontopediatric-history.entity';
import { ToothState } from './odontogram/entities/tooth-state.entity';
import { OrthodonticAnamnesis } from './orthodontic-anamnesis/entities/orthodontic-anamnesis.entity';

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
        entities: [Tenant, User, Patient, ClinicalHistoryEntry, Appointment, ToothSurfaceState, Treatment, Budget, BudgetItem, Payment, PatientDocument, PeriodontalMeasurement, Prescription, Expense, AuditLog, Announcement, Cie10Code, PlannedTreatment, ConsentTemplate, Tooth, MedicalHistory, OdontopediatricHistory, ToothState, OrthodonticAnamnesis],
        synchronize: true, // ¡Solo para desarrollo!
      }),
    }),
    // --- FIN DE LA CORRECCIÓN ---

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/',
    }),

    // Módulos
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
    OrthodonticAnamnesisModule,
    CashManagementModule,
    ReportsModule,
    AuditModule,
    DashboardModule,
    LocationsModule,
    UtilsModule,
    MailModule,
    SuperAdminModule,
    AnnouncementsModule,
    Cie10Module,
    PlannedTreatmentsModule,
    ConsentTemplatesModule,
    GoogleCalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}