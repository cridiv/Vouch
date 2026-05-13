import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { SquadService } from '../squad/squad.service.js';
import { FraudService } from '../fraud/fraud.service.js';
import { DeveloperService } from '../developer/developer.service.js';
import { DeveloperLogService } from '../common/services/developer-log.service.js';
import { CreateAgreementDto } from './dto/create-agreement.dto.js';
import { Developer, EscrowStatus } from '@prisma/client';
import { EscrowState } from './state/escrow.state.js';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly squadService: SquadService,
    private readonly fraudService: FraudService,
    private readonly developerService: DeveloperService,
    private readonly developerLogService: DeveloperLogService,
    private readonly stateMachine: EscrowState,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAgreement(dto: CreateAgreementDto, developer: Developer) {
    this.logger.log(`Creating escrow agreement for developer: ${developer.id}`);

    // Thing 1 — Resolve Both Users
    const buyer = await this.developerService.resolveOrCreatePlatformUser(dto.buyerExternalId, developer.id);
    const seller = await this.developerService.resolveOrCreatePlatformUser(dto.sellerExternalId, developer.id);

    const milestonesTotal = dto.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (milestonesTotal !== dto.totalAmount) {
      throw new BadRequestException(
        `Milestone amounts (${milestonesTotal}) must equal totalAmount (${dto.totalAmount})`
      );
    }

    // Thing 2 — Validate Both Are Identity Verified
    if (!buyer.identityVerified) {
      throw new BadRequestException('Buyer identity not verified');
    }
    if (!seller.identityVerified) {
      throw new BadRequestException('Seller identity not verified');
    }

    // Thing 3 — Create the Agreement and Milestones in DB (Atomically)
    const agreement = await this.prisma.agreement.create({
      data: {
        developerId: developer.id,
        buyerExternalId: dto.buyerExternalId,
        sellerExternalId: dto.sellerExternalId,
        totalAmount: dto.totalAmount,
        status: 'PENDING',
        milestones: {
          create: dto.milestones.map((m) => ({
            title: m.title,
            amount: m.amount,
            status: 'PENDING',
          })),
        },
      },
      include: {
        milestones: true,
      },
    });

    // Thing 4 — Create the Squad Virtual Account
    const buyerEmail = dto.buyerEmail ?? `${dto.buyerExternalId}@vouch.sandbox`;
    const buyerName = dto.buyerName ?? 'Vouch User';

    let virtualAccount;
    try {
      virtualAccount = await this.squadService.createVirtualAccount(
        agreement.id,
        buyerEmail,
        buyerName,
      );
    } catch (err: any) {
      this.logger.error(`Failed to create Squad virtual account for agreement ${agreement.id}:`, err.message);
      // Clean up the created agreement & milestones so we don't leave orphaned pending records
      await this.prisma.milestone.deleteMany({ where: { agreementId: agreement.id } });
      await this.prisma.agreement.delete({ where: { id: agreement.id } });
      throw new BadRequestException(`Squad virtual account creation failed: ${err.message}`);
    }

    // Update the Agreement with virtual account details
    const updatedAgreement = await this.prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        squadVirtualAccountId: virtualAccount.customer_identifier || agreement.id,
        squadVirtualAccountNo: virtualAccount.virtual_account_number,
      },
      include: {
        milestones: true,
      },
    });

    // Thing 5 — Log the Event
    void this.developerLogService.log({
      developerId: developer.id,
      eventType: 'ESCROW_CREATED',
      externalUserId: dto.buyerExternalId,
      agreementId: updatedAgreement.id,
      payload: {
        agreement: updatedAgreement,
        virtualAccount,
      },
    });

    return {
      agreementId: updatedAgreement.id,
      status: updatedAgreement.status,
      totalAmount: updatedAgreement.totalAmount,
      currency: updatedAgreement.currency,
      squadVirtualAccountNo: updatedAgreement.squadVirtualAccountNo,
      squadBank: virtualAccount.bank ?? 'GTBank',
      buyerExternalId: updatedAgreement.buyerExternalId,
      sellerExternalId: updatedAgreement.sellerExternalId,
      createdAt: updatedAgreement.createdAt,
      milestones: updatedAgreement.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        amount: m.amount,
        status: m.status,
        buyerConfirmed: m.buyerConfirmed,
        sellerConfirmed: m.sellerConfirmed,
      })),
    };
  }

  @OnEvent('payment.confirmed')
  async handlePaymentConfirmed(payload: {
    agreementId: string;
    transactionRef: string;
  }) {
    this.logger.log(
      `payment.confirmed received for agreement ${payload.agreementId}, ref ${payload.transactionRef}`
    );

    try {
      // Step 1 — Fetch current agreement and validate state
      const agreement = await this.prisma.agreement.findUnique({
        where: { id: payload.agreementId }
      });

      if (!agreement) {
        this.logger.warn(`Agreement ${payload.agreementId} not found. Ignoring payment event.`);
        return;
      }

      // Step 2 — Verify transaction with Squad
      const verification = await this.squadService.verifyTransaction(payload.transactionRef);

      if (!verification.success) {
        this.logger.warn(
          `Transaction ${payload.transactionRef} could not be verified by Squad. Ignoring.`
        );

        void this.developerLogService.log({
          developerId: agreement.developerId,
          eventType: 'ESCROW_FUND_FAILED',
          agreementId: payload.agreementId,
          payload: {
            transactionRef: payload.transactionRef,
            reason: 'Squad transaction verification failed',
            squadStatus: verification.status,
          }
        });
        return;
      }

      if (agreement.status !== 'PENDING') {
        this.logger.warn(
          `Agreement ${payload.agreementId} is already ${agreement.status}. Ignoring duplicate event.`
        );
        return;
      }

      // Step 3 — Transition state machine
      this.stateMachine.transition(agreement.status as EscrowStatus, EscrowStatus.FUNDED);

      // Step 4 — Update agreement in DB
      await this.prisma.agreement.update({
        where: { id: payload.agreementId },
        data: { status: 'FUNDED' }
      });

      this.logger.log(`Agreement ${payload.agreementId} successfully moved to FUNDED`);

      // Step 5 — Log the event
      void this.developerLogService.log({
        developerId: agreement.developerId,
        eventType: 'ESCROW_FUNDED',
        agreementId: payload.agreementId,
        payload: {
          transactionRef: payload.transactionRef,
          amount: verification.amount,
          squadStatus: verification.status,
        }
      });

    } catch (error: any) {
      this.logger.error(
        `Failed to handle payment.confirmed for agreement ${payload.agreementId}:`,
        error.message
      );

      // Attempt to log the exception if we have an agreement context
      try {
        const agreement = await this.prisma.agreement.findUnique({
          where: { id: payload.agreementId }
        });
        if (agreement) {
          void this.developerLogService.log({
            developerId: agreement.developerId,
            eventType: 'ESCROW_FUND_FAILED',
            agreementId: payload.agreementId,
            payload: {
              transactionRef: payload.transactionRef,
              reason: error.message || 'Unknown processing error',
            }
          });
        }
      } catch (logErr: any) {
        this.logger.error('Failed to log payment.confirmed failure to DeveloperLog:', logErr.message);
      }
    }
  }
}
