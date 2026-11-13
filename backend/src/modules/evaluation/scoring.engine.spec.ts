import { computeScorecard, CriterionSpec, ScoreSheet, validateSheet } from './scoring.engine';

const sheet = (interviewerId: number, scores: Record<number, number>): ScoreSheet => ({ interviewerId, scores });

describe('Scorecard Engine (spec 004)', () => {
  it('S4.9 — điểm tổng trọng số 60/40 = 3.80, không cờ', () => {
    const criteria: CriterionSpec[] = [
      { id: 1, weightPercent: 60, isKnockout: false },
      { id: 2, weightPercent: 40, isKnockout: false },
    ];
    const r = computeScorecard(criteria, [sheet(10, { 1: 4.0, 2: 3.0 }), sheet(11, { 1: 4.0, 2: 4.0 })]);
    expect(r.perCriterion.map((c) => c.mean)).toEqual([4.0, 3.5]);
    expect(r.overallScore).toBe(3.8);
    expect(r.hasVarianceAlert).toBe(false);
    expect(r.isDisqualified).toBe(false);
  });

  it('S4.10 — A=5.0, B=2.0 ⇒ TB 3.50, Δ=3.0 ⇒ cảnh báo lệch', () => {
    const criteria: CriterionSpec[] = [{ id: 1, weightPercent: 100, isKnockout: false }];
    const r = computeScorecard(criteria, [sheet(10, { 1: 5.0 }), sheet(11, { 1: 2.0 })]);
    expect(r.perCriterion[0]).toMatchObject({ mean: 3.5, delta: 3.0, varianceFlag: true });
    expect(r.overallScore).toBe(3.5);
    expect(r.hasVarianceAlert).toBe(true);
  });

  it('S4.11 — biên Δ: 1.5 không cảnh báo, 2.0 có cảnh báo', () => {
    const criteria: CriterionSpec[] = [{ id: 1, weightPercent: 100, isKnockout: false }];
    expect(computeScorecard(criteria, [sheet(1, { 1: 4.0 }), sheet(2, { 1: 2.5 })]).hasVarianceAlert).toBe(false);
    expect(computeScorecard(criteria, [sheet(1, { 1: 4.0 }), sheet(2, { 1: 2.0 })]).hasVarianceAlert).toBe(true);
  });

  it('S4.12 — điểm liệt tập thể: TB 1.75 < 2.0 ⇒ bị loại dù điểm tổng cao', () => {
    const criteria: CriterionSpec[] = [
      { id: 1, weightPercent: 20, isKnockout: true },
      { id: 2, weightPercent: 80, isKnockout: false },
    ];
    const r = computeScorecard(criteria, [sheet(1, { 1: 2.0, 2: 5.0 }), sheet(2, { 1: 1.5, 2: 5.0 })]);
    expect(r.perCriterion[0]).toMatchObject({ mean: 1.75, knockoutFail: true });
    expect(r.isDisqualified).toBe(true);
    expect(r.overallScore).toBeGreaterThanOrEqual(3.5);
  });

  it('S4.13 — điểm liệt cá nhân (4.0 / 1.5, TB 2.75): không loại nhưng buộc calibration', () => {
    const criteria: CriterionSpec[] = [{ id: 1, weightPercent: 100, isKnockout: true }];
    const r = computeScorecard(criteria, [sheet(1, { 1: 4.0 }), sheet(2, { 1: 1.5 })]);
    expect(r.isDisqualified).toBe(false);
    expect(r.perCriterion[0].knockoutWarn).toBe(true);
    expect(r.hasVarianceAlert).toBe(true);
  });

  it('điểm liệt cá nhân với Δ nhỏ (2.0 / 1.5, TB 1.75) ⇒ loại, cờ knockoutWarn không tính thêm cảnh báo', () => {
    const criteria: CriterionSpec[] = [{ id: 1, weightPercent: 100, isKnockout: true }];
    const r = computeScorecard(criteria, [sheet(1, { 1: 2.0 }), sheet(2, { 1: 1.5 })]);
    expect(r.isDisqualified).toBe(true);
    expect(r.hasVarianceAlert).toBe(false);
  });

  it('bất biến: hoán vị giám khảo không đổi kết quả; S luôn trong [1, 5]', () => {
    const criteria: CriterionSpec[] = [
      { id: 1, weightPercent: 33, isKnockout: false },
      { id: 2, weightPercent: 33, isKnockout: true },
      { id: 3, weightPercent: 34, isKnockout: false },
    ];
    const a = sheet(1, { 1: 1.0, 2: 5.0, 3: 3.5 });
    const b = sheet(2, { 1: 4.5, 2: 2.5, 3: 1.0 });
    const c = sheet(3, { 1: 5.0, 2: 3.0, 3: 2.0 });
    const r1 = computeScorecard(criteria, [a, b, c]);
    const r2 = computeScorecard(criteria, [c, a, b]);
    expect(r2).toEqual(r1);
    expect(r1.overallScore).toBeGreaterThanOrEqual(1);
    expect(r1.overallScore).toBeLessThanOrEqual(5);
  });

  it('S4.2 — phiếu thiếu tiêu chí / điểm sai bước / ngoài thang bị từ chối', () => {
    const criteria: CriterionSpec[] = [
      { id: 1, weightPercent: 50, isKnockout: false },
      { id: 2, weightPercent: 50, isKnockout: false },
    ];
    expect(() => validateSheet(criteria, { 1: 4 })).toThrow(expect.objectContaining({ code: 'EVAL_INCOMPLETE_SCORES' }));
    expect(() => validateSheet(criteria, { 1: 4, 2: 3.3 })).toThrow(expect.objectContaining({ code: 'EVAL_INVALID_SCORE' }));
    expect(() => validateSheet(criteria, { 1: 4, 2: 5.5 })).toThrow(expect.objectContaining({ code: 'EVAL_INVALID_SCORE' }));
    expect(() => validateSheet(criteria, { 1: 4, 2: 0.5 })).toThrow(expect.objectContaining({ code: 'EVAL_INVALID_SCORE' }));
    expect(() => validateSheet(criteria, { 1: 4, 2: 3, 3: 2 })).toThrow(expect.objectContaining({ code: 'EVAL_INCOMPLETE_SCORES' }));
    expect(() => validateSheet(criteria, { 1: 4, 2: 3.5 })).not.toThrow();
  });
});

