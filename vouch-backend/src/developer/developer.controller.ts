import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiKeyGuard } from './guard/api-key.guard';
import { CurrentDeveloper } from '../common/decorators/current-developer.decorator.js';
import * as client from '@prisma/client';
export class ProvisionDeveloperDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  supabaseUid: string;
}

export class GenerateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}

@Controller('developer')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post('provision')
  @HttpCode(HttpStatus.OK)
  async provision(@Body() body: ProvisionDeveloperDto) {
    const result = await this.developerService.provision(body.email, body.supabaseUid);
    return {
      developerId: result.developer.id,
      apiKey: result.apiKey,
    };
  }

  @Post('api-keys')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  async generateApiKey(
    @CurrentDeveloper() developer: client.Developer,
    @Body() body: GenerateApiKeyDto, // Body: { name?: string }
  ) {
    const result = await this.developerService.generateApiKey(
      developer.id,
      body.name,
    );
    return result; 
  }

  @Get('stats')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async getStats(
    @CurrentDeveloper() developer: client.Developer,
  ) {
    return this.developerService.getStats(developer.id);
  }

  @Get('logs')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async getLogs(
    @CurrentDeveloper() developer: client.Developer,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('eventType') eventType?: string,
  ) {
    return this.developerService.getLogs(
      developer.id,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
      eventType,
    );
  }

  @Get('logs/:id')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async getLogById(
    @CurrentDeveloper() developer: client.Developer,
    @Param('id') id: string,
  ) {
    const log = await this.developerService.getLogById(id, developer.id);
    if (!log) {
      throw new NotFoundException(`DeveloperLog with ID "${id}" not found.`);
    }
    return log;
  }
}
