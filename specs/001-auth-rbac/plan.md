# Plan 001 — Auth, Registration & 5-Role RBAC

## Technical Context
NestJS 11 · Prisma 6 · PostgreSQL 16 · `@nestjs/jwt` + `passport-jwt` · `bcryptjs` (cost 10).

## Constitution Check
- [x] I. Module `auth` tự chứa; export `AuthService`.
- [x] IV. Mọi API nội bộ yêu cầu JWT (trừ `@Public()` cho `/api/auth/login`, `/api/auth/register`, `/api/public/*`); không bao giờ trả `passwordHash`.

## Contracts
| Method | Path | Quyền | Body / Ghi chú |
|:--|:--|:--|:--|
| POST | `/api/auth/register` | Public | `{fullName, email, phone?, password, role?, departmentId?}` → `{accessToken, user}` |
| POST | `/api/auth/login` | Public | `{email, password}` → `{accessToken, user}` |
| GET | `/api/auth/me` | đã đăng nhập | thông tin user hiện tại |
| GET | `/api/departments` | Public / đã đăng nhập | dùng cho cả form đăng ký chọn phòng ban |
| POST | `/api/departments` | ADMIN | `{name, managerId?}` |
| GET | `/api/users?role=` | ADMIN, HR, HIRING_MANAGER | danh sách tài khoản |
| POST | `/api/users` | ADMIN | tạo tài khoản nội bộ |
| PATCH | `/api/users/:id/status` | ADMIN | `{status: 'ACTIVE' \| 'INACTIVE'}` |

## Mã lỗi
`AUTH_INVALID_CREDENTIALS` (401) · `AUTH_UNAUTHORIZED` (401) · `AUTH_FORBIDDEN` (403) · `USER_EMAIL_TAKEN` (409) · `USER_INVALID` (400)
