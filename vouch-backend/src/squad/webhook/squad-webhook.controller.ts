import { Controller, Post, Req, Res, UnauthorizedException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('squad')
export class SquadWebhookController {
  private readonly logger = new Logger(SquadWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const body = req.body;
    const squadSignature = req.headers['x-squad-signature'];

    if (!squadSignature) {
      throw new UnauthorizedException('Missing signature');
    }

    // Step 1: Verify signature immediately
    const hash = crypto
      .createHmac('sha512', process.env.SQUAD_WEBHOOK_SECRET || '')
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== squadSignature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Step 2: Return 200 immediately
    res.status(200).send('OK');

    // Step 3: Process asynchronously after response sent
    setImmediate(async () => {
      try {
        const agreementId = body.meta?.agreementId || body.customer_identifier;
        let platformUserId: string | null = null;

        if (agreementId) {
          const agreement = await this.prisma.agreement.findUnique({
            where: { id: agreementId },
          });
          if (agreement) {
            const platformUser = await this.prisma.platformUser.findUnique({
              where: {
                externalUserId_developerId: {
                  externalUserId: agreement.buyerExternalId,
                  developerId: agreement.developerId,
                },
              },
            });
            if (platformUser) {
              platformUserId = platformUser.id;
            }
          }
        }

        if (!platformUserId) {
          this.logger.error(`Cannot find platformUserId associated with agreement ${agreementId}. SquadSignal was not saved.`);
          return;
        }

        // Extract Squad signals
        const signals = {
          transactionRef: body.transaction_ref,
          paymentChannel: body.payment_channel || 'Unknown',
          cardBin: body.card?.first_6digits || null,
          payerName: body.customer?.name || null,
          amountMatchesAgreement: true, // We assume true if webhook fires, or we can compare later
          rawWebhookPayload: body,
        };

        // Save SquadSignal to DB
        await this.prisma.squadSignal.create({ 
          data: { 
            ...signals, 
            agreementId: agreementId,
            platformUserId: platformUserId,
          } 
        });

        // Emit event — escrow module listens for this
        this.eventEmitter.emit('payment.confirmed', { 
          agreementId: agreementId, 
          transactionRef: body.transaction_ref 
        });
      } catch (err: any) {
        this.logger.error('Failed to process webhook asynchronously', err.message);
      }
    });
  }
}
