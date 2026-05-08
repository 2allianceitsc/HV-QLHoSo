import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getConfig(): Promise<R2Config> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'storage.r2' },
    });

    if (!setting?.value) {
      throw new InternalServerErrorException('R2 storage not configured. Go to System Settings → Storage and fill in R2 credentials.');
    }

    let config: R2Config;
    try {
      config = JSON.parse(setting.value) as R2Config;
    } catch {
      throw new InternalServerErrorException('Invalid R2 storage configuration (JSON parse failed).');
    }

    const missing = (['accountId', 'accessKeyId', 'secretAccessKey', 'bucket'] as const)
      .filter((k) => !config[k]);
    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `R2 storage incomplete. Missing fields: ${missing.join(', ')}. Go to System Settings → Storage.`,
      );
    }

    return config;
  }

  private buildClient(config: R2Config): S3Client {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  getEnvPrefix(): string {
    return process.env.R2_ENV_PREFIX ?? 'dev';
  }

  buildPublicUrl(config: R2Config, key: string): string {
    return `${config.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  /**
   * Upload a file buffer directly to R2 (server-side upload).
   * @returns the object key and publicUrl
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ key: string; publicUrl: string }> {
    const config = await this.getConfig();
    const client = this.buildClient(config);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to upload file key=${key}`, err);
      throw new InternalServerErrorException('Failed to upload file to storage.');
    }

    return { key, publicUrl: this.buildPublicUrl(config, key) };
  }

  /**
   * Delete an object from R2 by its storage key.
   */
  async deleteFile(key: string): Promise<void> {
    let config: R2Config;
    try {
      config = await this.getConfig();
    } catch {
      this.logger.warn(`R2 not configured — skipping deleteFile for key=${key}`);
      return;
    }
    const client = this.buildClient(config);

    try {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    } catch (err) {
      this.logger.error(`Failed to delete file key=${key}`, err);
    }
  }

  /**
   * Get the public base URL from config.
   */
  async getPublicUrlBase(): Promise<string> {
    const config = await this.getConfig();
    return config.publicUrl.replace(/\/$/, '');
  }

  /**
   * Generate a presigned PUT URL for direct browser → R2 upload.
   * @param folder  e.g. 'avatars'
   * @param ext     file extension e.g. 'jpg'
   * @param contentType  MIME type e.g. 'image/jpeg'
   * @param expiresIn   seconds until URL expires (default 300)
   * @returns { uploadUrl, key, publicUrl }
   */
  async getPresignedUploadUrl(
    folder: string,
    ext: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    const config = await this.getConfig();
    const client = this.buildClient(config);

    const key = `${folder}/${uuidv7()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    });

    let uploadUrl: string;
    try {
      uploadUrl = await getSignedUrl(client, command, { expiresIn });
    } catch (err) {
      this.logger.error(`Failed to generate presigned URL for key=${key}`, err);
      throw new InternalServerErrorException('Failed to generate upload URL. Check R2 credentials in System Settings.');
    }
    const publicUrl = this.buildPublicUrl(config, key);

    return { uploadUrl, key, publicUrl };
  }
}
