import { IsNotEmpty, IsNumber, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateBridgeDto {
  @IsNumber()
  @IsNotEmpty()
  startTooth: number;

  @IsNumber()
  @IsNotEmpty()
  endTooth: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['red', 'blue'])
  color: string;
}