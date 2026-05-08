import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HvReportsService } from './hv-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';

@UseGuards(JwtAuthGuard, HvRoleGuard)
@Controller('reports')
export class HvReportsController {
  constructor(private readonly service: HvReportsService) {}

  @Get('summary')
  @HvRoles('reviewer', 'approver')
  summary(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.summary(year ? +year : undefined, month ? +month : undefined);
  }

  @Get('contracts')
  @HvRoles('reviewer', 'approver', 'admin')
  contracts(
    @Query('q') q?: string,
    @Query('contractStatus') contractStatus?: string,
    @Query('contractEndDateFrom') contractEndDateFrom?: string,
    @Query('contractEndDateTo') contractEndDateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.contracts({
      q,
      contractStatus: contractStatus as 'expiring_soon' | 'expired' | undefined,
      contractEndDateFrom,
      contractEndDateTo,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Get('expenses')
  @HvRoles('approver')
  expenses(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('department') department?: string,
    @Query('costCode') costCode?: string,
    @Query('supplier') supplier?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.expenses({ fromDate, toDate, department, costCode, supplier, page: page ? +page : 1, limit: limit ? +limit : 50 });
  }
}
