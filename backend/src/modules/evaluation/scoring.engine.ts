import { DomainError } from '../../shared/domain/domain-error';

/**
 * Scorecard Engine (spec 004, plan 004) — HÀM THUẦN.
 * Mọi so sánh biên được thực hiện trên "đơn vị nửa điểm" h = score × 2 (số nguyên 2..10)
 * để tránh sai số dấu phẩy động (FR-402).
 */

export interface CriterionSpec {
  id: number;
  weightPercent: number; // số nguyên, tổng = 100 (D02)
  isKnockout: boolean;
}

export interface ScoreSheet {
  interviewerId: number;
  scores: Record<number, number>; // criteriaId → điểm 1.0..5.0 bước 0.5
}

export interface CriterionResult {
  criteriaId: number;
  mean: number; // làm tròn 2 chữ số
  delta: number;
  min: number;
  max: number;
  varianceFlag: boolean; // Δ ≥ 2.0
  knockoutFail: boolean; // tiêu chí điểm liệt có TB < 2.0
  knockoutWarn: boolean; // tiêu chí điểm liệt có cá nhân ≤ 1.5
}

export interface ScorecardResult {
  overallScore: number;
  hasVarianceAlert: boolean;
  isDisqualified: boolean;
  perCriterion: CriterionResult[];
}

export const VARIANCE_THRESHOLD_HALF = 4; // Δ ≥ 2.0
export const KNOCKOUT_MEAN_HALF = 4; // TB < 2.0
export const KNOCKOUT_INDIVIDUAL_HALF = 3; // cá nhân ≤ 1.5

/** Chuyển điểm sang đơn vị nửa điểm, kiểm tra thang & bước (D02). */
export function toHalfUnits(score: number): number {
  const h = score * 2;
  if (!Number.isFinite(score) || !Number.isInteger(h) || h < 2 || h > 10) {
    throw new DomainError('EVAL_INVALID_SCORE', `Điểm ${score} không hợp lệ (1.0–5.0, bước 0.5)`);
  }
  return h;
}

/** Kiểm tra một phiếu chấm có đủ và đúng mọi tiêu chí của Job (S4.2). */
export function validateSheet(criteria: CriterionSpec[], scores: Record<number, number>): void {
  const ids = new Set(criteria.map((c) => c.id));
  for (const key of Object.keys(scores)) {
    if (!ids.has(Number(key))) {
      throw new DomainError('EVAL_INCOMPLETE_SCORES', `Tiêu chí ${key} không thuộc Job này`);
    }
  }
  for (const c of criteria) {
    if (scores[c.id] === undefined || scores[c.id] === null) {
      throw new DomainError('EVAL_INCOMPLETE_SCORES', 'Phiếu chấm phải có điểm cho mọi tiêu chí');
    }
    toHalfUnits(scores[c.id]);
  }
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function computeScorecard(criteria: CriterionSpec[], sheets: ScoreSheet[]): ScorecardResult {
  if (criteria.length === 0) throw new DomainError('EVAL_NO_CRITERIA', 'Job chưa có tiêu chí chấm điểm');
  if (sheets.length === 0) throw new DomainError('EVAL_NO_SHEETS', 'Chưa có phiếu chấm nào');
  const weightSum = criteria.reduce((a, c) => a + c.weightPercent, 0);
  if (weightSum !== 100) throw new DomainError('CRITERIA_WEIGHT_SUM', 'Tổng trọng số phải bằng 100%');
  sheets.forEach((s) => validateSheet(criteria, s.scores));

  const m = sheets.length;
  let weightedHalfSum = 0; // Σ w_i × Σ_j h_ij
  const perCriterion: CriterionResult[] = criteria.map((c) => {
    const hs = sheets.map((s) => toHalfUnits(s.scores[c.id]));
    const sum = hs.reduce((a, b) => a + b, 0);
    const minH = Math.min(...hs);
    const maxH = Math.max(...hs);
    weightedHalfSum += c.weightPercent * sum;
    return {
      criteriaId: c.id,
      mean: round2(sum / (2 * m)),
      delta: (maxH - minH) / 2,
      min: minH / 2,
      max: maxH / 2,
      varianceFlag: maxH - minH >= VARIANCE_THRESHOLD_HALF,
      knockoutFail: c.isKnockout && sum < KNOCKOUT_MEAN_HALF * m,
      knockoutWarn: c.isKnockout && minH <= KNOCKOUT_INDIVIDUAL_HALF,
    };
  });

  // S = Σ (w_i/100) × (Σ_j h_ij / 2m) = weightedHalfSum / (200 m); làm tròn 2 chữ số.
  const overallScore = Math.round(weightedHalfSum / (2 * m)) / 100;
  const isDisqualified = perCriterion.some((r) => r.knockoutFail);
  const hasVarianceAlert = perCriterion.some((r) => r.varianceFlag || (r.knockoutWarn && !r.knockoutFail));

  return { overallScore, hasVarianceAlert, isDisqualified, perCriterion };
}

