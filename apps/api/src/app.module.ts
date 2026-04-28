import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ErrorLogModule } from './error-log/error-log.module';
import { PrismaModule } from './prisma/prisma.module';
import { LogPrismaModule } from './prisma/log-prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { DepartmentModule } from './department/department.module';
import { OfficeModule } from './office/office.module';
import { PositionModule } from './position/position.module';
import { TeamModule } from './team/team.module';
import { ClientModule } from './client/client.module';
import { ProfileModule } from './profile/profile.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeeModule } from './employee/employee.module';
import { StatusModule } from './status/status.module';
import { AttendanceModule } from './attendance/attendance.module';
import { VibeIconsModule } from './vibe-icons/vibe-icons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SystemRolesModule } from './system/roles/roles.module';
import { SystemSettingsModule } from './system/settings/settings.module';
import { SystemStatusesModule } from './system/statuses/statuses.module';
import { AuditModule } from './system/audit/audit.module';
import { SystemVibeIconsModule } from './system/vibe-icons/vibe-icons.module';
import { HealthModule } from './health/health.module';
import { ApiLogModule } from './system/api-log/api-log.module';
import { ApiLoggingInterceptor } from './common/interceptors/api-logging.interceptor';
import { BrandingModule } from './branding/branding.module';
import { EmailModule } from './email/email.module';
import { SystemWarningsModule } from './system/warnings/warnings.module';
import { LoginOtpModule } from './system/login-otp/login-otp.module';
import { IntegrityModule } from './system/integrity/integrity.module';
import { DropdownDisplayModule } from './dropdown-display/dropdown-display.module';
import { PermissionsModule } from './system/permissions/permissions.module';
import { DebugModule } from './common/debug/debug.module';

@Module({
  imports: [
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: path.join(process.cwd(), 'apps/api/public'),
            exclude: ['/api/(.*)'],
          }),
        ]
      : []),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config: Record<string, unknown>) => {
        const required = ['DATABASE_URL'];
        for (const key of required) {
          if (!config[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
          }
        }
        return config;
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 300, // fallback; runtime value read from DB setting "throttle_default_limit"
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5,
      },
    ]),
    PrismaModule,
    LogPrismaModule,
    AuthModule,
    CompanyModule,
    DepartmentModule,
    OfficeModule,
    PositionModule,
    TeamModule,
    ClientModule,
    ProfileModule,
    DashboardModule,
    EmployeeModule,
    StatusModule,
    AttendanceModule,
    VibeIconsModule,
    NotificationsModule,
    ReportsModule,
    // System modules (EP10)
    SystemRolesModule,
    SystemSettingsModule,
    SystemStatusesModule,
    AuditModule,
    SystemVibeIconsModule,
    HealthModule,
    ErrorLogModule,
    ApiLogModule,
    BrandingModule,
    EmailModule,
    SystemWarningsModule,
    LoginOtpModule,
    IntegrityModule,
    DropdownDisplayModule,
    PermissionsModule,
    DebugModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiLoggingInterceptor },
  ],
})
export class AppModule {}
