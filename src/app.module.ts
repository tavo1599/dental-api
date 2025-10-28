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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // --- FÁBRICA DE TypeORM CORREGIDA ---
      useFactory: (configService: ConfigService) => {
        
        // 1. Detecta si estás en producción (Render)
        const isProduction = configService.get<string>('NODE_ENV') === 'production';

        // 2. Define la configuración de SSL
        const sslConfig = isProduction 
          ? { ssl: { rejectUnauthorized: false } } // Necesario para Render
          : {}; // Vacío para localhost

        // 3. Devuelve la configuración completa
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: true,
          ...sslConfig, // 4. Aplica la configuración SSL aquí
        };
      },
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