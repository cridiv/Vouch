import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller.js';
import { EscrowService } from './escrow.service.js';
import { SquadModule } from '../squad/squad.module.js';
import { FraudModule } from '../fraud/fraud.module.js';
import { DeveloperModule } from '../developer/developer.module.js';
import { CommonModule } from '../common/common.module.js';
import { EscrowState } from './state/escrow.state.js';

@Module({
  imports: [SquadModule, FraudModule, DeveloperModule, CommonModule],
  controllers: [EscrowController],
  providers: [EscrowService, EscrowState],
  exports: [EscrowService],
})
export class EscrowModule {}
