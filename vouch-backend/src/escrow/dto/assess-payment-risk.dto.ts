import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  simulate_vpn?: boolean;

  @IsBoolean()
  @IsOptional()
  simulate_impossible_travel?: boolean;
}
