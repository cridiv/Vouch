import { Injectable, BadRequestException } from '@nestjs/common';
import { EscrowStatus } from '@prisma/client';

@Injectable()
export class EscrowState {
  private readonly VALID_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
    PENDING:     ['FUNDED', 'FROZEN'],
    FUNDED:      ['IN_PROGRESS', 'COMPLETED', 'DISBURSED', 'FROZEN'],
    IN_PROGRESS: ['COMPLETED', 'DISBURSED', 'FROZEN'],
    COMPLETED:   ['DISBURSED', 'FROZEN'],
    DISBURSED:   [],
    FROZEN:      [],
  };

  transition(current: EscrowStatus, next: EscrowStatus): void {
    if (!this.VALID_TRANSITIONS[current].includes(next)) {
      throw new BadRequestException(`Invalid escrow transition: ${current} → ${next}`);
    }
  }
}
