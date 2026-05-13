import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssessPaymentRiskDto {
  @IsString()
  @IsNotEmpty()
  externalUserId: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  deviceFingerprint?: string;
}
