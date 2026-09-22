import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Between, MoreThan, Repository } from 'typeorm';
import { Budget } from '../budgets/entities/budget.entity'; // <-- 1. Importa Budget
import { startOfDay, endOfDay, subDays } from 'date-fns'; // <-- 2. Importa date-fns
import { isSettingAllowed, RequestUser } from '../auth/settings-permission';
import { branchScope } from '../common/scope';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    // --- 3. AÑADE BudgetRepository ---
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
  ) {}

  /**
   * El resumen mezcla datos de dinero con la agenda del dia y los
   * cumpleanos. Por eso el permiso se aplica recortando campos y no
   * bloqueando el endpoint: a un doctor sin permiso para ver cifras hay
   * que seguir dandole sus citas.
   */
  async getSummary(tenantId: string, branchId: string | null, user?: RequestUser) {
    // La agenda y el dinero se separan por sede; los pacientes no, porque una
    // clinica comparte su fichero entre todas sus sedes.
    const porSede = branchScope<any>(tenantId, branchId);
    // --- LÓGICA DE FECHAS (Usando date-fns para consistencia) ---
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const tomorrowEnd = endOfDay(tomorrowStart);
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const lastMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));

    // --- CÁLCULOS ---
    const todayAppointments = await this.appointmentRepository.find({ where: { ...porSede, startTime: Between(todayStart, todayEnd) }, relations: ['patient'], order: { startTime: 'ASC' } });
    const tomorrowAppointments = await this.appointmentRepository.find({ where: { ...porSede, startTime: Between(tomorrowStart, tomorrowEnd) }, relations: ['patient'], order: { startTime: 'ASC' } });
    const patientCount = await this.patientRepository.count({ where: { tenant: { id: tenantId } } });
    const newPatientsThisMonth = await this.patientRepository.count({ where: { tenant: { id: tenantId }, createdAt: Between(monthStart, monthEnd) } });

    const monthlyPayments = await this.paymentRepository.find({
        where: { ...porSede, paymentDate: Between(monthStart, monthEnd) },
        relations: ['budget', 'budget.items', 'budget.items.treatment', 'budget.doctor'],
    });
    const monthlyIncome = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const revenueByDoctor = monthlyPayments.reduce((acc, payment) => {
      const doctorName = payment.budget?.doctor?.fullName || 'Sin Asignar';
      if (!acc[doctorName]) acc[doctorName] = 0;
      acc[doctorName] += Number(payment.amount);
      return acc;
    }, {} as Record<string, number>);

    const topTreatments = monthlyPayments.reduce((acc, payment) => {
        payment.budget?.items.forEach(item => {
            // --- CORRECCIÓN CLAVE AQUÍ ---
            // Usamos 'item.treatment?.name' para evitar el error si el tratamiento es nulo
            const treatmentName = item.treatment?.name || 'Tratamiento Eliminado';
            // --- FIN DE LA CORRECCIÓN ---

            if (!acc[treatmentName]) acc[treatmentName] = 0;
            const itemTotal = Number(item.priceAtTimeOfBudget) * item.quantity;
            // Usamos '?' por si el presupuesto fue eliminado
            const budgetTotal = Number(payment.budget?.totalAmount); 
            
            if (budgetTotal > 0) {
              acc[treatmentName] += (itemTotal / budgetTotal) * Number(payment.amount);
            }
        });
        return acc;
    }, {} as Record<string, number>);

    const lastMonthPayments = await this.paymentRepository.find({ where: { ...porSede, paymentDate: Between(lastMonthStart, lastMonthEnd) } });
    const lastMonthIncome = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const upcomingBirthdays = await this.patientRepository.query(
      `SELECT "fullName", "birthDate", "phone" FROM "patients"
      WHERE "tenantId" = $1 AND
      EXTRACT(DOY FROM "birthDate") >= EXTRACT(DOY FROM NOW()) AND
      EXTRACT(DOY FROM "birthDate") <= EXTRACT(DOY FROM NOW() + INTERVAL '30 day')
      ORDER BY EXTRACT(DOY FROM "birthDate") ASC
      LIMIT 5`,
      [tenantId]
    );

    const base = {
      todayAppointments,
      tomorrowAppointments,
      patientCount,
      newPatientsThisMonth,
      upcomingBirthdays,
    };

    // Sin permiso, las cifras no se envian siquiera: esconderlas solo en la
    // interfaz no servia de nada, porque la respuesta se ve en el navegador.
    if (!isSettingAllowed(user, 'CanSeeDashboardStats')) {
      return base;
    }

    return {
      ...base,
      monthlyIncome,
      revenueByDoctor,
      topTreatments: Object.entries(topTreatments).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, total]) => ({ name, total })),
      lastMonthIncome,
    };
  }

  async getMonthlyRevenue(tenantId: string, branchId: string | null) {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const payments = await this.paymentRepository.find({
      where: {
        ...branchScope<any>(tenantId, branchId),
        paymentDate: MoreThan(last12Months),
      },
      relations: ['budget'],
      order: { paymentDate: 'ASC' },
    });

    const revenueByMonth = payments.reduce((acc, payment) => {
      const month = new Date(payment.paymentDate).toLocaleString('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      if (!acc[month]) acc[month] = 0;
      acc[month] += Number(payment.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(revenueByMonth),
      data: Object.values(revenueByMonth),
    };
  }

  async getAppointmentStatusSummary(tenantId: string, branchId: string | null) {
    const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const monthEnd = endOfDay(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

    // branchId nulo = consolidado del titular, que si ve todas las sedes.
    const params: any[] = [tenantId, monthStart, monthEnd];
    let filtroSede = '';
    if (branchId) {
      params.push(branchId);
      filtroSede = `AND "branchId" = $${params.length}`;
    }

    const query = `
      SELECT status, COUNT(*) as count
      FROM appointments
      WHERE "tenantId" = $1
        AND "startTime" BETWEEN $2 AND $3
        ${filtroSede}
      GROUP BY status;
    `;

    const result = await this.appointmentRepository.query(query, params);

    return {
      labels: result.map((item: any) => item.status),
      data: result.map((item: any) => parseInt(item.count, 10)),
    };
  }
}