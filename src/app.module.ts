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
import { OrthodonticAnamnesis } from './orthodontic-anamnesis/entities/orthodontic-anamnesis.entity';
import { OrthodonticAnamnesisModule } from './orthodontic-anamnesis/orthodontic-anamnesis.module';
import { ToothState } from './odontogram/entities/tooth-state.entity';


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

    ServeStaticModule.forRoot({
      // La carpeta física en el servidor
      rootPath: join(process.cwd(), 'uploads'),
      // Servimos los archivos estáticos bajo /uploads para que las URLs
      // como /uploads/documents/archivo.pdf funcionen correctamente desde el frontend
      serveRoot: '/uploads',
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
    OrthodonticAnamnesisModule,
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