import { Controller, Post, UseInterceptors, UploadedFiles, Body, BadRequestException, UseGuards, Ip } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../developer/guard/api-key.guard.js';
import { CurrentDeveloper } from '../common/decorators/current-developer.decorator.js';
import * as client from '@prisma/client';
import { IdentityService } from './identity.service.js';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class VerifyIdentityDto {
  @IsString()
  @IsNotEmpty()
  external_user_id: string;

  @IsOptional()
  @IsString()
  device_fingerprint?: string;
}

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('verify')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'document_image', maxCount: 1 },
        { name: 'selfie_images', maxCount: 25 },
      ],
      {
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB total limit
        },
        fileFilter: (req, file, callback) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
            return callback(
              new BadRequestException('Only JPEG and PNG images are allowed!'),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  async verifyIdentity(
    @UploadedFiles()
    files: {
      document_image?: Express.Multer.File[];
      selfie_images?: Express.Multer.File[];
    },
    @Body() body: VerifyIdentityDto,
    @CurrentDeveloper() developer: client.Developer,
    @Ip() ip: string,
  ) {
    const docFile = files.document_image?.[0];
    const selfieFiles = files.selfie_images || [];

    if (!docFile || selfieFiles.length === 0) {
      throw new BadRequestException('Both document_image and at least one selfie_image must be uploaded.');
    }

    // Call the identity service with multiple selfie buffers
    const selfieBuffers = selfieFiles.map(f => f.buffer);
    
    const result = await this.identityService.verify(
      docFile.buffer,
      selfieBuffers,
      body.external_user_id,
      developer,
      ip,
      body.device_fingerprint,
    );

    return {
      status: result.verified ? 'success' : 'failed',
      message: result.verified ? 'Identity verified successfully' : 'Identity verification unsuccessful',
      data: {
        id: 'idv_' + Math.random().toString(36).substr(2, 9),
        externalUserId: body.external_user_id,
        identityVerified: result.verified,
        identityMatchScore: result.match_score,
        livenessPassed: result.liveness_passed,
        documentType: result.document_type,
      },
    };
  }
}
