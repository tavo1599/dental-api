import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Between, MoreThan, Repository } from 'typeorm'; // <-- 1. Importa 'MoreThan'

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async getSummary(tenantId: string) {
    // --- LÓGICA DE FECHAS ---
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // --- CÁLCULOS ---
    const todayAppointments = await this.appointmentRepository.find({ where: { tenant: { id: tenantId }, startTime: Between(todayStart, todayEnd) }, relations: ['patient'], order: { startTime: 'ASC' } });
    const tomorrowAppointments = await this.appointmentRepository.find({ where: { tenant: { id: tenantId }, startTime: Between(tomorrowStart, tomorrowEnd) }, relations: ['patient'], order: { startTime: 'ASC' } });
    const patientCount = await this.patientRepository.count({ where: { tenant: { id: tenantId } } });
    const newPatientsThisMonth = await this.patientRepository.count({ where: { tenant: { id: tenantId }, createdAt: Between(monthStart, monthEnd) } });

    const monthlyPayments = await this.paymentRepository.find({
        where: { tenant: { id: tenantId }, paymentDate: Between(monthStart, monthEnd) },
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
            const treatmentName = item.treatment.name;
            if (!acc[treatmentName]) acc[treatmentName] = 0;
            const itemTotal = Number(item.priceAtTimeOfBudget) * item.quantity;
            const budgetTotal = Number(payment.budget.totalAmount);
            // Asigna el pago proporcionalmente al costo del item dentro del presupuesto
            if (budgetTotal > 0) {
              acc[treatmentName] += (itemTotal / budgetTotal) * Number(payment.amount);
            }
        });
        return acc;
    }, {} as Record<string, number>);

    const lastMonthPayments = await this.paymentRepository.find({ where: { tenant: { id: tenantId }, paymentDate: Between(lastMonthStart, lastMonthEnd) } });
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

    return {
      todayAppointments,
      tomorrowAppointments,
      patientCount,
      monthlyIncome,
      revenueByDoctor,
      topTreatments: Object.entries(topTreatments).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, total]) => ({ name, total })),
      newPatientsThisMonth,
      upcomingBirthdays,
      lastMonthIncome,
    };
  }

  // --- 2. MÉTODO MOVIDO DENTRO DE LA CLASE ---
  async getMonthlyRevenue(tenantId: string) {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const payments = await this.paymentRepository.find({
      where: {
        tenant: { id: tenantId },
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

  async getAppointmentStatusSummary(tenantId: string) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  // Usamos una consulta SQL para agrupar y contar directamente en la base de datos
  const query = `
    SELECT status, COUNT(*) as count
    FROM appointments
    WHERE "tenantId" = $1
      AND "startTime" BETWEEN $2 AND $3
    GROUP BY status;
  `;

  const result = await this.appointmentRepository.query(query, [tenantId, monthStart, monthEnd]);

  // Formateamos los datos para el gráfico
  return {
    labels: result.map((item: any) => item.status),
    data: result.map((item: any) => parseInt(item.count, 10)),
  };
}
}

