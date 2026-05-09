import { Controller } from '@nestjs/common';
import { FraudService } from './fraud.service.js';

@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}
}
