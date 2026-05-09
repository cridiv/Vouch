import { Injectable } from '@nestjs/common';
import { BehaviourService } from './behaviour.service.js';
import { DeviceService } from './device.service.js';
import { IpAnalysisService } from './ip-analysis.service.js';

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly behaviourService: BehaviourService,
    private readonly deviceService: DeviceService,
    private readonly ipAnalysisService: IpAnalysisService,
  ) {}
}
