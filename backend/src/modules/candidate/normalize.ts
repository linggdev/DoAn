/** D09 — chuẩn hoá trước khi quét trùng. */
export function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * Chỉ giữ chữ số; quy đầu số quốc tế Việt Nam về 0.
 *   "+84 912-345-678" → "0912345678", "0084912345678" → "0912345678", "84912345678" → "0912345678"
 * Trả null nếu không còn chữ số nào.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0084')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('84') && digits.length === 11) digits = '0' + digits.slice(2);
  return digits;
}

