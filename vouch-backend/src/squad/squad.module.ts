import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SquadService } from './squad.service.js';
import { SquadAuthHelper } from './helpers/squad-auth.helper.js';

@Module({
  imports: [HttpModule],
  providers: [SquadService, SquadAuthHelper],
  exports: [SquadService],
})
export class SquadModule {}
