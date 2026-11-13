import { normalizeEmail, normalizePhone } from './normalize';

describe('normalize (D09)', () => {
  it('S3.4 — email khác hoa/thường, có khoảng trắng được coi là một', () => {
    expect(normalizeEmail(' An.Nguyen@Mail.com ')).toBe(normalizeEmail('an.nguyen@mail.com'));
  });

  it.each([
    ['0912345678', '0912345678'],
    ['+84 912-345-678', '0912345678'],
    ['84912345678', '0912345678'],
    ['0084 912 345 678', '0912345678'],
    ['(091) 234.5678', '0912345678'],
  ])('S3.5 — SĐT %p → %p', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('SĐT rỗng → null', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(' - ')).toBeNull();
  });
});

