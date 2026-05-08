import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
