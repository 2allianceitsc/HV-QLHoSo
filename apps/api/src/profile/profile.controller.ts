import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, UpdateWidgetSettingsDto } from './dto/update-profile.dto';

class ConfirmAvatarDto {
  @IsString()
  publicUrl!: string;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getProfile(user.staffId ?? '');
  }

  @Put()
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.staffId ?? '', dto);
  }

  /**
   * Step 1: Get a presigned PUT URL to upload avatar directly to R2.
   * Query param: contentType (e.g. image/jpeg)
   */
  @Get('avatar/presign')
  async presignAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Query('contentType') contentType: string,
  ) {
    if (!contentType) {
      throw new BadRequestException('contentType query param is required');
    }
    return this.profileService.presignAvatar(user.staffId ?? '', contentType);
  }

  /**
   * Step 2: After uploading to R2, confirm the URL to save it in the DB.
   */
  @Post('avatar/confirm')
  async confirmAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmAvatarDto,
  ) {
    return this.profileService.confirmAvatar(user.staffId ?? '', dto.publicUrl);
  }

  @Patch('widget-settings')
  async updateWidgetSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateWidgetSettingsDto,
  ) {
    return this.profileService.updateWidgetSettings(user.staffId ?? '', dto);
  }

  /**
   * Birthday photo — Step 1: Get presigned PUT URL.
   */
  @Get('birthday-photo/presign')
  async presignBirthdayPhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Query('contentType') contentType: string,
  ) {
    if (!contentType) {
      throw new BadRequestException('contentType query param is required');
    }
    return this.profileService.presignBirthdayPhoto(user.staffId ?? '', contentType);
  }

  /**
   * Birthday photo — Step 2: Confirm URL after R2 upload.
   */
  @Post('birthday-photo/confirm')
  async confirmBirthdayPhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmAvatarDto,
  ) {
    return this.profileService.confirmBirthdayPhoto(user.staffId ?? '', dto.publicUrl);
  }
}
