/**
 * Base entity fields present on every Prisma model.
 * Use as a type reference, not for ORM inheritance.
 */
export interface IBaseEntity {
  id: string;
  note?: string | null;
  isDeleted: boolean;
  isDisabled: boolean;
  orderNo: number;
  logCreatedAt: Date;
  logCreatedBy?: string | null;
  logUpdatedAt: Date;
  logUpdatedBy?: string | null;
}
