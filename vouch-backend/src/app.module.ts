import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeveloperModule } from './developer/developer.module';
import { HealthController } from './health.controller';
import { CommonModule } from './common/common.module';
import { IdentityModule } from './identity/identity.module';
import { FraudModule } from './fraud/fraud.module';
import { SquadModule } from './squad/squad.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    DeveloperModule,
    CommonModule,
    IdentityModule,
    SquadModule,
    FraudModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }



