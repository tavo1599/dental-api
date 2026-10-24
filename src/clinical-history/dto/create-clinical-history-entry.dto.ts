import { IsString, IsNotEmpty, IsOptional, IsDateString, IsObject, IsBoolean, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer'; // <-- IMPORTANTE: Importar esto

export class CreateClinicalHistoryEntryDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  evolution?: string;

  @IsString()
  @IsOptional()
  treatmentPerformed?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  indications?: string;

  // --- CAMPOS PARA PRÓXIMA CITA ---
  
  @IsString()
  @IsOptional()
  // Opcional: Si quieres que se guarde como NULL en vez de "" en la base de datos
  @Transform(({ value }) => value === '' ? null : value) 
  nextAppointmentPlan?: string;

  @IsOptional()
  @IsDateString()
  // --- LA SOLUCIÓN ESTÁ AQUÍ ---
  // Si llega un string vacío "", lo transforma a null.
  // Al ser null, @IsOptional hace que @IsDateString lo ignore y pase la validación.
  @Transform(({ value }) => value === '' ? null : value)
  nextAppointmentDate?: string;

  /**
   * AGENDAR LA PROXIMA CITA EN EL MOMENTO
   *
   * Sin esto, la fecha de arriba es solo un recordatorio: alguien llamara al
   * paciente para acordar la hora. Con esto en true se crea ademas la cita de
   * verdad en la agenda, y entonces hacen falta hora y doctor, porque la
   * agenda reserva un espacio y comprueba cruces.
   */
  @IsOptional()
  @IsBoolean()
  scheduleNextAppointment?: boolean;

  /** Hora de la cita, en formato HH:mm. Hora de la clinica (Lima). */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de la próxima cita debe tener el formato HH:mm.',
  })
  nextAppointmentTime?: string;

  /** Cuanto dura, en minutos. */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  nextAppointmentDurationMinutes?: number;

  /** Quien atiende. Si no viene, el doctor que firma esta entrada. */
  @IsOptional()
  @IsUUID()
  nextAppointmentDoctorId?: string;

  /** Datos propios del rubro para esta sesion. Su forma la decide el front. */
  @IsObject()
  @IsOptional()
  sessionDetails?: Record<string, any>;
}
