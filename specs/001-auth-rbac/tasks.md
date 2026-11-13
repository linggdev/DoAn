# Tasks 001 — Auth, Đăng ký & RBAC 5 Vai trò (V2)

## Phase 0 — Setup
- [x] T001 Tạo `docker-compose.yml` (PostgreSQL 16 + Mailpit), `backend/.env.example`
- [x] T002 Khởi tạo NestJS backend, cài Prisma, `schema.prisma` 13 bảng + `enum Role` 5 vai trò (`ADMIN`, `HIRING_MANAGER`, `HR`, `INTERVIEWER`, `CANDIDATE`)
- [x] T003 `PrismaService` + `shared/` (`DomainExceptionFilter` mã lỗi `{statusCode, code, message}`, `DomainError`)
- [x] T004 Seed dữ liệu mẫu (`prisma/seed.ts`: 5 tài khoản mẫu cho 5 Role, phòng ban, 1 Job mẫu đầy đủ, ứng viên mẫu)

## Phase 1 — US1 & US2 Đăng nhập, Đăng ký & Phân quyền 5 Role
- [x] T005 [Test] `auth.service.spec.ts`: S1.1–S1.4 (Đăng ký chuẩn hóa email + bcrypt, chặn trùng `USER_EMAIL_TAKEN`, đăng nhập & chặn `INACTIVE`) — **PASS**
- [x] T006 `AuthService.login` + `AuthService.register` (bcrypt, kiểm tra `USER_EMAIL_TAKEN`), `JwtStrategy`, `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- [x] T007 `@Public`, `@Roles`, `@CurrentUser`, `JwtAuthGuard` + `RolesGuard` đăng ký global

## Phase 2 — US3 Phòng ban & Quản trị tài khoản (`ADMIN`)
- [x] T008 [Test] `auth.service.spec.ts`: S1.5, S1.6 (Quản lý phòng ban, gán Trưởng phòng, tạo tài khoản không lộ `passwordHash`) — **PASS**
- [x] T009 `AuthService/Controller` cho Departments & Users (không trả `passwordHash`, hỗ trợ gán Role & khóa tài khoản)
