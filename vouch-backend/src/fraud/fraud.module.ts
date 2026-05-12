import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeveloperModule } from '../developer/developer.module.js';
import { CommonModule } from '../common/common.module.js';
import { FraudService } from './fraud.service.js';
import { FraudController } from './fraud.controller.js';
import { BehaviourService } from './context/behaviour.service.js';
import { DeviceService } from './context/device.service.js';
import { IpAnalysisService } from './context/ip-analysis.service.js';
import { ContextBuilderService } from './context/context-builder.service.js';

@Module({
  imports: [HttpModule, DeveloperModule, CommonModule],
  controllers: [FraudController],
  providers: [
    FraudService,
    BehaviourService,
    DeviceService,
    IpAnalysisService,
    ContextBuilderService,
  ],
  exports: [FraudService, IpAnalysisService],
})
export class FraudModule {}
