import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../developer/guard/api-key.guard.js';
import { CurrentDeveloper } from '../common/decorators/current-developer.decorator.js';
import type { Developer } from '@prisma/client';
import { CreateAgreementDto } from './dto/create-agreement.dto.js';
import { ConfirmMilestoneDto } from './dto/confirm-milestone.dto.js';
import { AssessPaymentRiskDto } from './dto/assess-payment-risk.dto.js';
import { EscrowService } from './escrow.service.js';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post('agreements')
  @UseGuards(ApiKeyGuard)
  async createAgreement(
    @Body() dto: CreateAgreementDto,
    @CurrentDeveloper() developer: Developer,
  ) {
    return this.escrowService.createAgreement(dto, developer);
  }

  @Post('agreements/:id/milestones/:milestoneId/confirm')
  @UseGuards(ApiKeyGuard)
  async confirmMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: ConfirmMilestoneDto,
    @CurrentDeveloper() developer: Developer,
  ) {
    return this.escrowService.confirmMilestone(id, milestoneId, dto, developer);
  }

  @Get('agreements/:id')
  @UseGuards(ApiKeyGuard)
  async getAgreement(
    @Param('id') id: string,
    @CurrentDeveloper() developer: Developer,
  ) {
    return this.escrowService.getAgreement(id, developer);
  }

  @Post('agreements/:id/assess')
  @UseGuards(ApiKeyGuard)
  async assessPaymentRisk(
    @Param('id') id: string,
    @Body() dto: AssessPaymentRiskDto,
    @CurrentDeveloper() developer: Developer,
  ) {
    return this.escrowService.assessPaymentRisk(id, dto, developer);
  }

  /**
   * DEV/TEST ONLY: Simulate a Squad payment webhook to move agreement to FUNDED.
   */
  @Post('agreements/:id/simulate-payment')
  @UseGuards(ApiKeyGuard)
  async simulatePayment(
    @Param('id') id: string,
    @Body() body: { transactionRef: string },
    @CurrentDeveloper() developer: Developer,
  ) {
    return this.escrowService.simulatePayment(id, body.transactionRef, developer);
  }
}
