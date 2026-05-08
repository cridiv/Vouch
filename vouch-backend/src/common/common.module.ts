import { Global, Module } from '@nestjs/common';
import { DeveloperLogService } from './services/developer-log.service.js';

@Global()
@Module({
  providers: [DeveloperLogService],
  exports: [DeveloperLogService],
})
export class CommonModule {}
