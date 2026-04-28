import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  department: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  staff: {
    count: jest.fn(),
  },
};

describe('DepartmentService', () => {
  let service: DepartmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated data', async () => {
      prismaMock.department.findMany.mockResolvedValue([{ id: '1', name: 'Engineering' }]);
      prismaMock.department.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(prismaMock.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('filters by companyId when provided', async () => {
      prismaMock.department.findMany.mockResolvedValue([]);
      prismaMock.department.count.mockResolvedValue(0);

      await service.findAll({ companyId: 'company-uuid' });

      expect(prismaMock.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-uuid' }),
        }),
      );
    });

    it('defaults page=1 limit=20 when params omitted', async () => {
      prismaMock.department.findMany.mockResolvedValue([]);
      prismaMock.department.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prismaMock.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the department when found', async () => {
      prismaMock.department.findFirst.mockResolvedValue({ id: 'uuid', name: 'HR' });

      const result = await service.findOne('uuid');

      expect(result.name).toBe('HR');
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.department.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates department and passes createdBy', async () => {
      prismaMock.department.create.mockResolvedValue({ id: 'new-uuid' });

      const dto = { departmentCode: 'ENG', departmentName: 'Engineering', companyId: 'c-uuid' };
      await service.create(dto, 'creator-id');

      expect(prismaMock.department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'ENG',
            name: 'Engineering',
            logCreatedBy: 'creator-id',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      prismaMock.department.findFirst.mockResolvedValue({ id: 'uuid' });
      prismaMock.department.update.mockResolvedValue({ id: 'uuid', name: 'Renamed' });

      await service.update('uuid', { departmentName: 'Renamed' }, 'updater-id');

      expect(prismaMock.department.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Renamed', logUpdatedBy: 'updater-id' }),
        }),
      );
    });

    it('throws NotFoundException when department does not exist', async () => {
      prismaMock.department.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting isDeleted = true', async () => {
      prismaMock.department.findFirst.mockResolvedValue({ id: 'uuid' });
      prismaMock.staff.count.mockResolvedValue(0);
      prismaMock.department.update.mockResolvedValue({ id: 'uuid', isDeleted: true });

      await service.remove('uuid');

      expect(prismaMock.department.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } }),
      );
    });

    it('throws BadRequestException when staff are attached', async () => {
      prismaMock.department.findFirst.mockResolvedValue({ id: 'uuid' });
      prismaMock.staff.count.mockResolvedValue(3);

      await expect(service.remove('uuid')).rejects.toThrow(BadRequestException);
    });
  });
});
