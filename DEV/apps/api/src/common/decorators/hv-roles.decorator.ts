import { SetMetadata } from '@nestjs/common';

export type HvRole = 'staff' | 'reviewer' | 'approver' | 'admin';

export const HV_ROLES_KEY = 'hv_roles';

export const HvRoles = (...roles: HvRole[]) => SetMetadata(HV_ROLES_KEY, roles);
