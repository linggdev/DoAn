import { Body, Controller, Get, Injectable, Module, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, CurrentUser, Public, Roles } from '../../shared/auth/auth-guards';
import { PrismaService } from '../../shared/database/prisma.service';
import { DomainError } from '../../shared/domain/domain-error';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: { sub: number }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new DomainError('AUTH_UNAUTHORIZED', 'Tài khoản không hợp lệ hoặc đã bị khóa', 401);
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
    };
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: {
    fullName: string;
    email: string;
    password: string;
    role?: Role;
    departmentId?: number | null;
  }) {
    const email = (dto.email ?? '').trim().toLowerCase();
    const fullName = (dto.fullName ?? '').trim();
    if (!email || !fullName || !dto.password || dto.password.length < 6) {
      throw new DomainError(
        'USER_INVALID',
        'Vui lòng nhập đầy đủ họ tên, email và mật khẩu (tối thiểu 6 ký tự)',
      );
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new DomainError('USER_EMAIL_TAKEN', `Email "${email}" đã được đăng ký trước đó`, 409);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? Role.CANDIDATE;
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role,
        departmentId: dto.departmentId ?? null,
      },
      include: { department: true },
    });
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
      },
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = (email ?? '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { department: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new DomainError('AUTH_INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác', 401);
    }
    const matched = await bcrypt.compare(password ?? '', user.passwordHash);
    if (!matched) {
      throw new DomainError('AUTH_INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác', 401);
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
      },
    };
  }

  async listUsers(role?: Role) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        departmentId: true,
        status: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createUser(dto: {
    email: string;
    fullName: string;
    password: string;
    role: Role;
    departmentId?: number | null;
  }) {
    const email = (dto.email ?? '').trim().toLowerCase();
    if (!email || !dto.fullName?.trim() || !dto.password) {
      throw new DomainError('USER_INVALID', 'Vui lòng điền đầy đủ email, họ tên và mật khẩu');
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new DomainError('USER_EMAIL_TAKEN', `Email "${email}" đã được sử dụng`, 409);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: dto.role,
        departmentId: dto.departmentId ?? null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        departmentId: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async updateUserStatus(id: number, status: UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
  }

  async listDepartments() {
    return this.prisma.department.findMany({
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: true, requisitions: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createDepartment(dto: { name: string; managerId?: number | null }) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new DomainError('DEPT_INVALID', 'Tên phòng ban không được để trống');
    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: { name, managerId: dto.managerId ?? null },
      });
      if (dto.managerId) {
        await tx.user.update({
          where: { id: dto.managerId },
          data: { departmentId: dept.id },
        });
      }
      return dept;
    });
  }
}

@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('auth/register')
  register(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      role?: Role;
      departmentId?: number | null;
    },
  ) {
    return this.authService.register(body);
  }

  @Public()
  @Post('auth/login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('auth/me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @Get('users')
  listUsers(@Query('role') role?: Role) {
    return this.authService.listUsers(role);
  }

  @Roles(Role.ADMIN)
  @Post('users')
  createUser(
    @Body()
    body: {
      email: string;
      fullName: string;
      password: string;
      role: Role;
      departmentId?: number | null;
    },
  ) {
    return this.authService.createUser(body);
  }

  @Roles(Role.ADMIN)
  @Patch('users/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: UserStatus }) {
    return this.authService.updateUserStatus(id, body.status);
  }

  @Public()
  @Get('departments')
  listDepartments() {
    return this.authService.listDepartments();
  }

  @Roles(Role.ADMIN)
  @Post('departments')
  createDepartment(@Body() body: { name: string; managerId?: number | null }) {
    return this.authService.createDepartment(body);
  }
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

