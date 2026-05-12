import { Controller, Post, Body, UseGuards, Ip } from '@nestjs/common';
import { FraudService } from './fraud.service.js';
import { ApiKeyGuard } from '../developer/guard/api-key.guard.js';
import { CurrentDeveloper } from '../common/decorators/current-developer.decorator.js';
import type { Developer } from '@prisma/client';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class AssessFraudDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  platformUserId: string;

  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;

  @IsNumber()
  @IsNotEmpty()
  transactionAmount: number;

  @IsString()
  @IsOptional()
  agreementId?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsBoolean()
  @IsOptional()
  simulateVpn?: boolean;

  @IsBoolean()
  @IsOptional()
  simulateImpossibleTravel?: boolean;
}

@Controller('fraud')
@UseGuards(ApiKeyGuard)
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('assess')
  async assess(
    @Body() body: AssessFraudDto,
    @CurrentDeveloper() developer: Developer,
    @Ip() ip: string,
  ) {
    const ipAddress = body.ipAddress || ip;
    return this.fraudService.assess({
      developerId: developer.id,
      transactionId: body.transactionId,
      platformUserId: body.platformUserId,
      ipAddress,
      deviceFingerprint: body.deviceFingerprint,
      transactionAmount: body.transactionAmount,
      agreementId: body.agreementId,
      simulateVpn: body.simulateVpn,
      simulateImpossibleTravel: body.simulateImpossibleTravel,
    });
  }
}
