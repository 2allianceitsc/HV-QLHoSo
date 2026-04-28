import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../system/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
