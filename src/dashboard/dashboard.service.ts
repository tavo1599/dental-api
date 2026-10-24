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
        relations: ['budget', 'budget.items', 'budget.items.treatment', 'budget.items.product', 'budget.doctor'],
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
            // Una linea puede ser un tratamiento o un producto que se le
            // cobro al paciente. Si no es ninguno, el catalogo quedo sin esa
            // entrada.
            const treatmentName =
              item.treatment?.name || item.product?.name || 'Tratamiento Eliminado';
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

  /**
   * ============================================================================
   * INDICADORES SOBRE LOS QUE SE PUEDE ACTUAR
   *
   * Va en una llamada aparte del resumen a proposito: el resumen es lo primero
   * que se pinta y no debe esperar por esto.
   *
   * Todo lo de aqui se eligio con un criterio: que al verlo se pueda HACER
   * algo hoy. Un numero bonito que no cambia ninguna decision solo ocupa
   * sitio.
   *
   * Lo economico se recorta segun el permiso, igual que en el resumen: no se
   * manda y luego se esconde, porque la respuesta se ve en el navegador.
   * ============================================================================
   */
  async getInsights(
    tenantId: string,
    branchId: string | null,
    user?: RequestUser,
  ) {
    const hoy = new Date();
    const inicioMes = startOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const finMes = endOfDay(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    const inicioMesPasado = startOfDay(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
    const finMesPasado = endOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), 0));

    const sede = branchId ? ' AND a."branchId" = $2' : '';
    const params: any[] = branchId ? [tenantId, branchId] : [tenantId];

    /*
     * AUSENCIAS. El porcentaje de citas que acabaron en "no vino", de las que
     * ya pasaron. Si sube, los recordatorios no estan funcionando.
     *
     * Solo cuenta citas pasadas: una cita de la semana que viene todavia no
     * puede ser una ausencia, y meterla en el denominador bajaria el
     * porcentaje sin motivo.
     */
    const ausencias = await this.appointmentRepository.query(
      `SELECT
         COUNT(*) FILTER (WHERE a.status = 'no_show')::int AS faltas,
         COUNT(*)::int AS total
       FROM appointments a
       WHERE a."tenantId" = $1${sede}
         AND a."startTime" >= $${params.length + 1}
         AND a."startTime" <= $${params.length + 2}
         AND a."startTime" < NOW()
         AND a.status <> 'cancelled'`,
      [...params, inicioMes, finMes],
    );
    const ausenciasMesPasado = await this.appointmentRepository.query(
      `SELECT
         COUNT(*) FILTER (WHERE a.status = 'no_show')::int AS faltas,
         COUNT(*)::int AS total
       FROM appointments a
       WHERE a."tenantId" = $1${sede}
         AND a."startTime" >= $${params.length + 1}
         AND a."startTime" <= $${params.length + 2}
         AND a.status <> 'cancelled'`,
      [...params, inicioMesPasado, finMesPasado],
    );

    const tasa = (f: any) =>
      Number(f?.total) > 0 ? Math.round((Number(f.faltas) / Number(f.total)) * 100) : 0;

    /*
     * PACIENTES QUE NO VUELVEN. Los que tuvieron alguna cita pero ninguna en
     * los ultimos seis meses y no tienen ninguna futura. Es una lista de
     * llamadas, no una estadistica.
     */
    const dormidos = await this.patientRepository.query(
      `SELECT COUNT(*)::int AS n FROM patients p
       WHERE p."tenantId" = $1
         AND EXISTS (SELECT 1 FROM appointments a WHERE a."patientId" = p.id)
         AND NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a."patientId" = p.id
             AND a."startTime" > NOW() - INTERVAL '6 months'
         )`,
      [tenantId],
    );

    /*
     * POR CONTACTAR. Planes de proxima cita sin hora acordada. Se separa lo
     * que ya se paso de fecha: eso es un paciente al que se le olvido llamar.
     */
    const porContactar = await this.patientRepository.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE CAST(e."nextAppointmentDate" AS date) < CURRENT_DATE)::int AS vencidos
       FROM clinical_history_entries e
       LEFT JOIN appointments c ON c.id = e."plannedAppointmentId"
       WHERE e."tenantId" = $1
         AND e."nextAppointmentDate" IS NOT NULL
         AND (c.id IS NULL OR c.status IN ('cancelled','no_show'))`,
      [tenantId],
    );

    /*
     * ALMACEN. Lo que esta en el minimo o por debajo, y los lotes que caducan
     * en 30 dias. Son dos avisos que hoy solo se ven entrando a inventario.
     */
    const almacen = await this.patientRepository.query(
      `SELECT
         (SELECT COUNT(*)::int FROM products pr
          WHERE pr."tenantId" = $1 AND pr."isActive" AND pr."minStock" > 0
            AND COALESCE((
              SELECT SUM(st.quantity) FROM product_stocks st
              WHERE st."productId" = pr.id${branchId ? ' AND st."branchId" = $2' : ''}
            ), 0) <= pr."minStock"
         ) AS bajo_minimo,
         (SELECT COUNT(*)::int FROM product_lots l
          WHERE l."tenantId" = $1${branchId ? ' AND l."branchId" = $2' : ''}
            AND l.quantity > 0 AND l."expiryDate" IS NOT NULL
            AND l."expiryDate" <= CURRENT_DATE + INTERVAL '30 days'
         ) AS por_caducar`,
      params,
    );

    const operativo = {
      noShowRateThisMonth: tasa(ausencias[0]),
      noShowRateLastMonth: tasa(ausenciasMesPasado[0]),
      noShowCountThisMonth: Number(ausencias[0]?.faltas ?? 0),
      dormantPatients: Number(dormidos[0]?.n ?? 0),
      pendingContacts: Number(porContactar[0]?.total ?? 0),
      overduePendingContacts: Number(porContactar[0]?.vencidos ?? 0),
      lowStockProducts: Number(almacen[0]?.bajo_minimo ?? 0),
      expiringLots: Number(almacen[0]?.por_caducar ?? 0),
    };

    if (!isSettingAllowed(user, 'CanSeeDashboardStats')) {
      return operativo;
    }

    /*
     * POR COBRAR. El saldo de los presupuestos aceptados: dinero ya
     * comprometido que todavia no entro. Se separa lo que lleva mas de 30
     * dias, que es lo que hay que ir a cobrar.
     *
     * Solo presupuestos aceptados: uno pendiente o rechazado no es una deuda.
     */
    const porCobrar = await this.paymentRepository.query(
      `SELECT
         COALESCE(SUM(b."finalAmount" - b."paidAmount"), 0) AS total,
         COALESCE(SUM(CASE WHEN b."creationDate" < NOW() - INTERVAL '30 days'
                           THEN b."finalAmount" - b."paidAmount" ELSE 0 END), 0) AS vencido,
         COUNT(*)::int AS presupuestos
       FROM budgets b
       WHERE b."tenantId" = $1${branchId ? ' AND b."branchId" = $2' : ''}
         AND b.status IN ('approved','in_progress')
         AND b."finalAmount" - b."paidAmount" > 0.009`,
      params,
    );

    /*
     * PROYECCION DEL MES. Al ritmo que va, cuanto cerraria el mes.
     *
     * Es una regla de tres sobre los dias transcurridos, nada mas: no predice
     * nada, dice "si sigue asi". Se expone el ritmo diario para que se pueda
     * juzgar, y no se proyecta el primer dia del mes, cuando un solo cobro
     * daria una cifra absurda.
     */
    const cobradoMes = await this.paymentRepository.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS total FROM payments p
       WHERE p."tenantId" = $1${branchId ? ' AND p."branchId" = $2' : ''}
         AND p."paymentDate" >= $${params.length + 1}
         AND p."paymentDate" <= $${params.length + 2}`,
      [...params, inicioMes, finMes],
    );

    const ingresoMes = Number(cobradoMes[0]?.total ?? 0);
    const diasTranscurridos = hoy.getDate();
    const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const ritmoDiario = diasTranscurridos > 0 ? ingresoMes / diasTranscurridos : 0;

    return {
      ...operativo,
      receivableTotal: Number(Number(porCobrar[0]?.total ?? 0).toFixed(2)),
      receivableOverdue: Number(Number(porCobrar[0]?.vencido ?? 0).toFixed(2)),
      receivableBudgets: Number(porCobrar[0]?.presupuestos ?? 0),
      monthIncomeSoFar: Number(ingresoMes.toFixed(2)),
      dailyPace: Number(ritmoDiario.toFixed(2)),
      // Nulo los dos primeros dias: con tan pocos datos la cifra enganaria.
      projectedMonthIncome:
        diasTranscurridos >= 3 ? Number((ritmoDiario * diasDelMes).toFixed(2)) : null,
      daysElapsed: diasTranscurridos,
      daysInMonth: diasDelMes,
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