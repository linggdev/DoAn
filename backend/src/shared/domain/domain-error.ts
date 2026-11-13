/**
 * Lỗi nghiệp vụ dùng chung cho cả hàm thuần (domain) và service.
 * Exception filter chuyển thành JSON: { statusCode, code, message, details? }.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

