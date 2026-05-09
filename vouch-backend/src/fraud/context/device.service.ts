import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}
}
