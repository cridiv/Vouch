import { Controller, Post, UseInterceptors, UploadedFiles, BadRequestException, UseGuards } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../developer/guard/api-key.guard.js';

@Controller('identity')
export class IdentityController {
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
  ) {
    const docFile = files.document_image?.[0];
    const selfieFile = files.selfie_image?.[0];

    if (!docFile || !selfieFile) {
      throw new BadRequestException('Both document_image and selfie_image files must be uploaded.');
    }

    // Confirm buffers arrive in the controller
    console.log('[IdentityController] Document Image Buffer Size:', docFile.buffer ? docFile.buffer.length : 0);
    console.log('[IdentityController] Selfie Image Buffer Size:', selfieFile.buffer ? selfieFile.buffer.length : 0);

    return {
      status: 'success',
      message: 'Both document_image and selfie_image buffers received successfully.',
      files: {
        document_image: {
          originalname: docFile.originalname,
          size: docFile.size,
          mimetype: docFile.mimetype,
          hasBuffer: !!docFile.buffer,
        },
        selfie_image: {
          originalname: selfieFile.originalname,
          size: selfieFile.size,
          mimetype: selfieFile.mimetype,
          hasBuffer: !!selfieFile.buffer,
        },
      },
    };
  }
}
