import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class RequestAdminTransferDto {
  /** Usuario de la misma clinica que recibira la titularidad. */
  @IsUUID()
  @IsNotEmpty()
  toUserId: string;
}

export class ConfirmAdminTransferDto {
  /** Codigo de 6 digitos enviado al correo del titular actual. */
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
