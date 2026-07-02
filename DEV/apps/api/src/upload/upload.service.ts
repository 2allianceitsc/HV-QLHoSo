import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { uuidv7 } from 'uuidv7';
import * as path from 'path';

const ATTACHMENT_ALLOWED_EXTS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'eml', 'msg', 'mbox']);
const AVATAR_ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadFile(
    user: IJwtPayload,
    file: Express.Multer.File,
    context: 'attachment' | 'signed_contract' | 'content_image',
    submissionId: string,
  ) {
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase() || 'bin';

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('File quá lớn. Kích thước tối đa cho phép là 20MB.');
    }
    if (!ATTACHMENT_ALLOWED_EXTS.has(ext)) {
      throw new BadRequestException('Định dạng file không được hỗ trợ.');
    }

    const envPrefix = this.storage.getEnvPrefix();
    let storageKey: string;
    switch (context) {
      case 'attachment':
        storageKey = `${envPrefix}/submissions/${submissionId}/attachments/${uuidv7()}.${ext}`;
        break;
      case 'signed_contract':
        storageKey = `${envPrefix}/submissions/${submissionId}/contracts/${uuidv7()}.${ext}`;
        break;
      case 'content_image':
        storageKey = `${envPrefix}/submissions/${submissionId}/content/${uuidv7()}.${ext}`;
        break;
    }

    const { publicUrl } = await this.storage.uploadFile(storageKey, file.buffer, file.mimetype);

    const fileType = context === 'attachment' ? 'attachment' : 'signed_contract';

    const attachment = await this.prisma.attachment.create({
      data: {
        id: uuidv7(),
        submissionId,
        fileType,
        name: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        uploadedBy: user.staffId,
      },
    });

    return {
      id: attachment.id,
      name: attachment.name,
      storageKey: attachment.storageKey,
      publicUrl,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
    };
  }

  async uploadAvatar(user: IJwtPayload, file: Express.Multer.File) {
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase() || 'bin';

    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('File quá lớn. Kích thước tối đa cho phép là 5MB.');
    }
    if (!AVATAR_ALLOWED_EXTS.has(ext)) {
      throw new BadRequestException('Chỉ chấp nhận định dạng jpg, jpeg, png, webp.');
    }

    const staff = await this.prisma.staff.findFirst({
      where: { id: user.staffId, isDeleted: false },
      select: { id: true, avatarKey: true },
    });
    if (!staff) throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');

    const envPrefix = this.storage.getEnvPrefix();
    const storageKey = `${envPrefix}/user/${staff.id}/profile-picture/${uuidv7()}.${ext}`;

    const { publicUrl } = await this.storage.uploadFile(storageKey, file.buffer, file.mimetype);

    // Delete old avatar from R2 if exists
    if (staff.avatarKey) {
      await this.storage.deleteFile(staff.avatarKey).catch((err) =>
        this.logger.warn(`Could not delete old avatar R2 key=${staff.avatarKey}`, err),
      );
    }

    await (this.prisma.staff as any).update({
      where: { id: staff.id },
      data: { avatarKey: storageKey },
    });

    return { avatarKey: storageKey, publicUrl };
  }

  async deleteAttachment(user: IJwtPayload, id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Không tìm thấy file đính kèm.');

    if (!user.hvRoles?.includes('admin') && attachment.uploadedBy !== user.staffId) {
      throw new ForbiddenException('Bạn không có quyền xoá file này.');
    }

    await this.storage.deleteFile(attachment.storageKey).catch((err) =>
      this.logger.warn(`Could not delete R2 key=${attachment.storageKey}`, err),
    );

    await this.prisma.attachment.delete({ where: { id } });
  }
}
