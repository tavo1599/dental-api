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

// --- ¡NO IMPORTAMOS ENTIDADES AQUÍ! ---
// (Se eliminaron todas las importaciones de Patient, Budget, Tooth, etc.)

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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
        
        // --- CORRECCIÓN CLAVE ---
        // 1. autoLoadEntities le dice a TypeORM que cargue las entidades
        //    registradas en cada módulo (ej. en PatientsModule)
        autoLoadEntities: true,
        // 2. Eliminamos el array 'entities: [...]' que causaba el conflicto
        // --- FIN DE LA CORRECCIÓN ---

        synchronize: true,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      // --- CORRECCIÓN DE RUTA DE DOCUMENTOS ---
      // Cambiamos '/uploads' a '/' para que las URLs
      // (ej. /documents/archivo.pdf) funcionen
      serveRoot: '/',
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