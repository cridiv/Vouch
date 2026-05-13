import { IsString, IsOptional } from 'class-validator';

export class ConfirmMilestoneDto {
  @IsString()
  externalUserId: string;

  @IsOptional()
  @IsString()
  sellerAccountNumber?: string;

  @IsOptional()
  @IsString()
  sellerBankCode?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}
