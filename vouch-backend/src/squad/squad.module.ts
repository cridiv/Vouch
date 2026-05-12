import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SquadService } from './squad.service.js';
import { SquadAuthHelper } from './helpers/squad-auth.helper.js';
import { SquadWebhookController } from './webhook/squad-webhook.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [SquadWebhookController],
  providers: [SquadService, SquadAuthHelper],
  exports: [SquadService],
})
export class SquadModule {}
