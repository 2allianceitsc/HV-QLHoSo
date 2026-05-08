import { Injectable } from '@nestjs/common';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class DashboardService {
  // Dashboard is an HR-specific Vibe365 module scheduled for removal.
  // Methods are stubbed out — HR models (TimeTracking, StatusDefinition,
  // BusinessClient, ClientStaff) no longer exist in the HV schema.

  async getEmployeeDashboard(_user: IJwtPayload) {
    return { message: 'Dashboard not available in HV' };
  }

  async getManagerDashboard(_user: IJwtPayload) {
    return { message: 'Dashboard not available in HV' };
  }

  async getHrDashboard() {
    return { message: 'Dashboard not available in HV' };
  }

  async getClientDashboard(_user: IJwtPayload) {
    return { message: 'Dashboard not available in HV' };
  }
}
