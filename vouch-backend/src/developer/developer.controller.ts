import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
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
}
