import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto, UpdateWidgetSettingsDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getProfile(staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        userLogin: {
          select: {
            username: true,
            email: true,
            isFirstLogin: true,
            lastLogin: true,
          },
        },
        staffRoles: {
          where: { isDeleted: false },
          include: { role: { select: { name: true } } },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    return {
      id: staff.id,
      employeeId: staff.employeeId,
      firstName: staff.firstName,
      middleName: staff.middleName,
      surname: staff.surname,
      companyEmailAddress: staff.companyEmailAddress,
      mobileNumber: staff.mobileNumber,
      dateOfBirth: staff.dateOfBirth,
      gender: staff.gender,
      photoBusiness: staff.photoBusiness,
      photoBirthday: staff.photoBirthday,
      avatarKey: (staff as any).avatarKey as string | null,
      isManager: await this.computeIsManager(staff.id),
      company: staff.company,
      department: staff.department,
      office: staff.office,
      position: staff.position,
      team: staff.team,
      roles: staff.staffRoles.map((sr) => sr.role.name),
      userLogin: staff.userLogin,
      presentAddress: staff.presentAddress,
      permanentAddress: staff.permanentAddress,
      personalEmailAddress: staff.personalEmailAddress,
      cityOfBirth: staff.cityOfBirth,
      countryOfBirth: staff.countryOfBirth,
      maritalStatus: staff.maritalStatus,
      firstNameOfSpouse: staff.firstNameOfSpouse,
      middleNameOfSpouse: staff.middleNameOfSpouse,
      surnameOfSpouse: staff.surnameOfSpouse,
      numberOfChildren: staff.numberOfChildren,
      emergencyContactFullName: staff.emergencyContactFullName,
      relationshipToYou: staff.relationshipToYou,
      emergencyContactAreaCode: staff.emergencyContactAreaCode,
      emergencyContactNumber: staff.emergencyContactNumber,
      showFloatingWidget: (staff as any).showFloatingWidget as boolean,
      floatingWidgetPosition: (staff as any).floatingWidgetPosition as { side: 'left' | 'right'; yOffset: number } | null,
    };
  }

  async updateWidgetSettings(staffId: string, dto: UpdateWidgetSettingsDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, isDeleted: false } });
    if (!staff) throw new NotFoundException('Staff profile not found');

    const updated = await (this.prisma.staff as any).update({
      where: { id: staffId },
      data: {
        ...(dto.showFloatingWidget !== undefined && { showFloatingWidget: dto.showFloatingWidget }),
        ...(dto.floatingWidgetPosition !== undefined && { floatingWidgetPosition: dto.floatingWidgetPosition }),
      },
    });

    return {
      showFloatingWidget: updated.showFloatingWidget as boolean,
      floatingWidgetPosition: updated.floatingWidgetPosition as { side: 'left' | 'right'; yOffset: number } | null,
    };
  }

  async updateProfile(staffId: string, dto: UpdateProfileDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    const updated = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.middleName !== undefined && { middleName: dto.middleName }),
        ...(dto.surname !== undefined && { surname: dto.surname }),
        ...(dto.mobileNumber !== undefined && { mobileNumber: dto.mobileNumber }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.presentAddress !== undefined && { presentAddress: dto.presentAddress }),
        ...(dto.permanentAddress !== undefined && { permanentAddress: dto.permanentAddress }),
        ...(dto.personalEmailAddress !== undefined && { personalEmailAddress: dto.personalEmailAddress }),
        ...(dto.cityOfBirth !== undefined && { cityOfBirth: dto.cityOfBirth }),
        ...(dto.countryOfBirth !== undefined && { countryOfBirth: dto.countryOfBirth }),
        ...(dto.maritalStatus !== undefined && { maritalStatus: dto.maritalStatus }),
        ...(dto.firstNameOfSpouse !== undefined && { firstNameOfSpouse: dto.firstNameOfSpouse }),
        ...(dto.middleNameOfSpouse !== undefined && { middleNameOfSpouse: dto.middleNameOfSpouse }),
        ...(dto.surnameOfSpouse !== undefined && { surnameOfSpouse: dto.surnameOfSpouse }),
        ...(dto.numberOfChildren !== undefined && { numberOfChildren: dto.numberOfChildren }),
        ...(dto.emergencyContactFullName !== undefined && { emergencyContactFullName: dto.emergencyContactFullName }),
        ...(dto.relationshipToYou !== undefined && { relationshipToYou: dto.relationshipToYou }),
        ...(dto.emergencyContactAreaCode !== undefined && { emergencyContactAreaCode: dto.emergencyContactAreaCode }),
        ...(dto.emergencyContactNumber !== undefined && { emergencyContactNumber: dto.emergencyContactNumber }),
      },
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      middleName: updated.middleName,
      surname: updated.surname,
      mobileNumber: updated.mobileNumber,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      note: updated.note,
      presentAddress: updated.presentAddress,
      permanentAddress: updated.permanentAddress,
      personalEmailAddress: updated.personalEmailAddress,
      cityOfBirth: updated.cityOfBirth,
      countryOfBirth: updated.countryOfBirth,
      maritalStatus: updated.maritalStatus,
      firstNameOfSpouse: updated.firstNameOfSpouse,
      middleNameOfSpouse: updated.middleNameOfSpouse,
      surnameOfSpouse: updated.surnameOfSpouse,
      numberOfChildren: updated.numberOfChildren,
      emergencyContactFullName: updated.emergencyContactFullName,
      relationshipToYou: updated.relationshipToYou,
      emergencyContactAreaCode: updated.emergencyContactAreaCode,
      emergencyContactNumber: updated.emergencyContactNumber,
    };
  }

  async presignAvatar(
    staffId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(contentType)) {
      throw new BadRequestException('Only jpeg, png, webp images are allowed');
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[contentType];

    try {
      const { uploadUrl, publicUrl } = await this.storage.getPresignedUploadUrl(
        `avatars/${staffId}`,
        ext,
        contentType,
      );
      return { uploadUrl, publicUrl };
    } catch (err) {
      this.logger.error(`presignAvatar failed for staffId=${staffId} contentType=${contentType}`, err);
      throw err;
    }
  }

  async confirmAvatar(
    staffId: string,
    publicUrl: string,
  ): Promise<{ avatarUrl: string }> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    try {
      await this.prisma.staff.update({
        where: { id: staffId },
        data: { photoBusiness: publicUrl },
      });
    } catch (err) {
      this.logger.error(`confirmAvatar DB update failed for staffId=${staffId}`, err);
      throw err;
    }

    return { avatarUrl: publicUrl };
  }

  async presignBirthdayPhoto(
    staffId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(contentType)) {
      throw new BadRequestException('Only jpeg, png, webp images are allowed');
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[contentType];

    const { uploadUrl, publicUrl } = await this.storage.getPresignedUploadUrl(
      `birthday-photos/${staffId}`,
      ext,
      contentType,
    );

    return { uploadUrl, publicUrl };
  }

  async confirmBirthdayPhoto(
    staffId: string,
    publicUrl: string,
  ): Promise<{ photoUrl: string }> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    await this.prisma.staff.update({
      where: { id: staffId },
      data: { photoBirthday: publicUrl },
    });

    return { photoUrl: publicUrl };
  }

  /** CR-015: isManager derived from junction tables — staff is a manager if they appear in any *Manager table */
  private async computeIsManager(staffId: string): Promise<boolean> {
    const count = await this.prisma.companyManager.count({
      where: { staffId, isDeleted: false },
    });
    if (count > 0) return true;
    const count2 = await this.prisma.departmentManager.count({
      where: { staffId, isDeleted: false },
    });
    if (count2 > 0) return true;
    const count3 = await this.prisma.officeManager.count({
      where: { staffId, isDeleted: false },
    });
    if (count3 > 0) return true;
    const count4 = await this.prisma.teamManager.count({
      where: { staffId, isDeleted: false },
    });
    return count4 > 0;
  }
}
