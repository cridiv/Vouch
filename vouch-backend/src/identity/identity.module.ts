import { Module } from '@nestjs/common';
import { DeveloperModule } from '../developer/developer.module.js';
import { HttpModule } from '@nestjs/axios';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';

@Module({
  imports: [DeveloperModule, HttpModule],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}