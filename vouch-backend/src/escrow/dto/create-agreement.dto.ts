import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMilestoneDto } from './create-milestone.dto.js';

export class CreateAgreementDto {
  @IsString()
  buyerExternalId: string;

  @IsString()
  sellerExternalId: string;

  @IsNumber()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones: CreateMilestoneDto[];

  // Needed for Squad virtual account creation
  @IsOptional()
  @IsString()
  buyerEmail?: string;

  @IsOptional()
  @IsString()
  buyerName?: string;
}
