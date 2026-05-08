import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeveloperModule } from './developer/developer.module';
import { HealthController } from './health.controller';
import { CommonModule } from './common/common.module.js';
import { IdentityModule } from './identity/identity.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    DeveloperModule,
    CommonModule,
    IdentityModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }



