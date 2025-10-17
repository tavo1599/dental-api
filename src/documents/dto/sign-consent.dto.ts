import { IsString, IsNotEmpty, IsBase64 } from 'class-validator';
export class SignConsentDto {
  @IsString() @IsNotEmpty()
  patientId: string;

  @IsString() @IsNotEmpty()
  templateId: string;

  @IsBase64() // <-- Cambia @IsString() por @IsBase64()
  @IsNotEmpty()
  signatureBase64: string;
}