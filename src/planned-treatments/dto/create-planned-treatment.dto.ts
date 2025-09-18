import { IsUUID } from 'class-validator';

export class CreatePlannedTreatmentDto {
  @IsUUID()
  toothSurfaceStateId: string;

  @IsUUID()
  treatmentId: string;

  @IsUUID()
  patientId: string;
}