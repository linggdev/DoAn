import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { AuthService } from './auth.module';

describe('Spec 001 — Auth, Registration & 5-Role RBAC (S1.1–S1.6)', () => {
  function createMockEnv() {
    const users: any[] = [];
    const departments: any[] = [{ id: 1, name: 'Engineering', managerId: null }];

    const prisma: any = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.email) {
            return users.find((u) => u.email === where.email) ?? null;
          }
          if (where.id) {
            return users.find((u) => u.id === where.id) ?? null;
          }
          return null;
        }),
        create: jest.fn(async ({ data, select }: any) => {
          const created = {
            id: users.length + 1,
            email: data.email,
            fullName: data.fullName,
            passwordHash: data.passwordHash,
            role: data.role,
            departmentId: data.departmentId ?? null,
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            department: departments.find((d) => d.id === data.departmentId) ?? null,
          };
          users.push(created);
          if (select && !select.passwordHash) {
            const { passwordHash, ...safe } = created;
            return safe;
          }
          return created;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return users
            .filter((u) => (!where?.role ? true : u.role === where.role))
            .map(({ passwordHash, ...safe }) => safe);
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const found = users.find((u) => u.id === where.id);
          if (!found) throw new Error('Not found');
          Object.assign(found, data);
          const { passwordHash, ...safe } = found;
          return safe;
        }),
      },
      department: {
        findMany: jest.fn(async () => departments),
        create: jest.fn(async ({ data }: any) => {
          const d = { id: departments.length + 1, name: data.name, managerId: data.managerId };
          departments.push(d);
          return d;
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const jwt = new JwtService({ secret: 'test-secret' });
    const service = new AuthService(prisma, jwt);
    return { service, users, departments };
  }

  it('S1.1: Đăng ký thành công với email được chuẩn hóa chữ thường, băm bcrypt và trả về accessToken + Role', async () => {
    const { service, users } = createMockEnv();
    const res = await service.register({
      fullName: '  Nguyễn Quốc Tuấn ',
      email: '  Tuan.Nguyen@ATS.local ',
      password: 'Password@123',
      role: Role.CANDIDATE,
    });

    expect(res.accessToken).toBeDefined();
    expect(res.user.email).toBe('tuan.nguyen@ats.local');
    expect(res.user.role).toBe(Role.CANDIDATE);
    expect(users[0].passwordHash).not.toBe('Password@123');
  });

  it('S1.2: Chặn đăng ký trùng Email (không phân biệt hoa/thường & khoảng trắng) với mã USER_EMAIL_TAKEN (409)', async () => {
    const { service } = createMockEnv();
    await service.register({
      fullName: 'HR One',
      email: 'hr@ats.local',
      password: 'Password@123',
      role: Role.HR,
    });

    await expect(
      service.register({
        fullName: 'HR Duplicate',
        email: '  HR@ats.local ',
        password: 'Password@123',
        role: Role.HR,
      }),
    ).rejects.toMatchObject({
      code: 'USER_EMAIL_TAKEN',
      status: 409,
    });
  });

  it('S1.3 & S1.4: Đăng nhập hợp lệ thành công; sai mật khẩu hoặc tài khoản INACTIVE bị chặn với AUTH_INVALID_CREDENTIALS (401)', async () => {
    const { service } = createMockEnv();
    const created = await service.register({
      fullName: 'Trần Minh Quân',
      email: 'hm@ats.local',
      password: 'Password@123',
      role: Role.HIRING_MANAGER,
      departmentId: 1,
    });

    const loginOk = await service.login(' HM@ats.local ', 'Password@123');
    expect(loginOk.user.role).toBe(Role.HIRING_MANAGER);
    expect(loginOk.user.departmentName).toBe('Engineering');

    await expect(service.login('hm@ats.local', 'WrongPass')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
    });

    // Khóa tài khoản -> đăng nhập bị từ chối
    await service.updateUserStatus(created.user.id, UserStatus.INACTIVE);
    await expect(service.login('hm@ats.local', 'Password@123')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
    });
  });

  it('S1.5 & S1.6: Admin tạo tài khoản nội bộ (không bao giờ lộ passwordHash) và tạo Phòng ban kèm gán Trưởng phòng', async () => {
    const { service } = createMockEnv();
    const hm = await service.createUser({
      email: 'lead@ats.local',
      fullName: 'Lê Trưởng Phòng',
      password: 'Password@123',
      role: Role.HIRING_MANAGER,
    });

    expect((hm as any).passwordHash).toBeUndefined();

    const dept = await service.createDepartment({
      name: 'Data & AI Platform',
      managerId: hm.id,
    });
    expect(dept.name).toBe('Data & AI Platform');
    expect(dept.managerId).toBe(hm.id);
  });
});
