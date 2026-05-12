import { Module } from '@nestjs/common';
import { DeveloperModule } from '../developer/developer.module.js';
import { HttpModule } from '@nestjs/axios';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';
import { FraudModule } from '../fraud/fraud.module.js';
import { IpAnalysisService } from '../fraud/context/ip-analysis.service.js';

@Module({
  imports: [DeveloperModule, HttpModule, FraudModule],
  controllers: [IdentityController],
  providers: [IdentityService, IpAnalysisService],
})
export class IdentityModule {}