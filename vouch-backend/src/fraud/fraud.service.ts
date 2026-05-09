import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContextBuilderService } from './context/context-builder.service.js';

@Injectable()
export class FraudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextBuilderService: ContextBuilderService,
  ) {}
}
