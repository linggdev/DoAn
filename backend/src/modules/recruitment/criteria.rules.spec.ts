import { validateCriteria } from './criteria.rules';

describe('criteria.rules', () => {
  it('S2.8 — tổng 90% bị từ chối', () => {
    expect(() =>
      validateCriteria([
        { criteriaName: 'A', weightPercent: 30 },
        { criteriaName: 'B', weightPercent: 30 },
        { criteriaName: 'C', weightPercent: 30 },
      ]),
    ).toThrow(expect.objectContaining({ code: 'CRITERIA_WEIGHT_SUM' }));
  });

  it('S2.9 — 50/30/20 hợp lệ, chuẩn hoá tên và cờ điểm liệt', () => {
    const result = validateCriteria([
      { criteriaName: '  Chuyên môn ', weightPercent: 50, isKnockout: true },
      { criteriaName: 'Giải quyết vấn đề', weightPercent: 30 },
      { criteriaName: 'Giao tiếp', weightPercent: 20 },
    ]);
    expect(result).toEqual([
      { criteriaName: 'Chuyên môn', weightPercent: 50, isKnockout: true },
      { criteriaName: 'Giải quyết vấn đề', weightPercent: 30, isKnockout: false },
      { criteriaName: 'Giao tiếp', weightPercent: 20, isKnockout: false },
    ]);
  });

  it('S2.10 — trùng tên (khác hoa thường) bị từ chối', () => {
    expect(() =>
      validateCriteria([
        { criteriaName: 'Giao tiếp', weightPercent: 50 },
        { criteriaName: 'GIAO TIẾP', weightPercent: 50 },
      ]),
    ).toThrow(expect.objectContaining({ code: 'CRITERIA_INVALID' }));
  });

  it.each([0, 101, 12.5, -5])('S2.10 — trọng số %p bị từ chối', (w) => {
    expect(() => validateCriteria([{ criteriaName: 'A', weightPercent: w }])).toThrow(
      expect.objectContaining({ code: 'CRITERIA_INVALID' }),
    );
  });

  it('danh sách rỗng bị từ chối', () => {
    expect(() => validateCriteria([])).toThrow(expect.objectContaining({ code: 'CRITERIA_INVALID' }));
  });
});

