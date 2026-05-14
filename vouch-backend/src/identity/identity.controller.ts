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
        { name: 'selfie_image', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB limit
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
      selfie_image?: Express.Multer.File[];
    },
    @Body() body: VerifyIdentityDto,
    @CurrentDeveloper() developer: client.Developer,
    @Ip() ip: string,
  ) {
    const docFile = files.document_image?.[0];
    const selfieFile = files.selfie_image?.[0];

    if (!docFile || !selfieFile) {
      throw new BadRequestException('Both document_image and selfie_image files must be uploaded.');
    }

    // Call the identity service
    const result = await this.identityService.verify(
      docFile.buffer,
      selfieFile.buffer,
      body.external_user_id,
      developer,
      ip,
      body.device_fingerprint,
    );

    return result;
  }
}
