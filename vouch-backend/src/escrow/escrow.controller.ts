import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../developer/guard/api-key.guard.js';
import { CurrentDeveloper } from '../common/decorators/current-developer.decorator.js';
import type { Developer } from '@prisma/client';
import { CreateAgreementDto } from './dto/create-agreement.dto.js';
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
}
