import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { UploadService } from './upload.service';
import { IsString, IsIn, IsOptional } from 'class-validator';

class UploadFileDto {
  @IsString()
  @IsIn(['attachment', 'signed_contract', 'content_image'])
  context!: 'attachment' | 'signed_contract' | 'content_image';

  @IsOptional()
  @IsString()
  submissionId?: string;
}

@UseGuards(JwtAuthGuard, HvRoleGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) throw new BadRequestException('File là bắt buộc.');
    if (!dto.submissionId && dto.context !== 'content_image') {
      throw new BadRequestException('submissionId là bắt buộc.');
    }
    return this.uploadService.uploadFile(
      req.user as IJwtPayload,
      file,
      dto.context,
      dto.submissionId ?? '',
    );
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File là bắt buộc.');
    return this.uploadService.uploadAvatar(req.user as IJwtPayload, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(@Req() req: Request, @Param('id') id: string) {
    await this.uploadService.deleteAttachment(req.user as IJwtPayload, id);
  }
}
