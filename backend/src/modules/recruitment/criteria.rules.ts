import { DomainError } from '../../shared/domain/domain-error';

export interface CriterionInput {
  criteriaName: string;
  weightPercent: number;
  isKnockout?: boolean;
}

export interface CriterionNormalized {
  criteriaName: string;
  weightPercent: number;
  isKnockout: boolean;
}

export const MAX_CRITERIA = 10;

/** FR-203 / D02: trọng số nguyên 1–100, tổng = 100, tên không trùng (không phân biệt hoa thường). */
export function validateCriteria(list: CriterionInput[]): CriterionNormalized[] {
  if (!Array.isArray(list) || list.length === 0) {
    throw new DomainError('CRITERIA_INVALID', 'Cần ít nhất 1 tiêu chí chấm điểm');
  }
  if (list.length > MAX_CRITERIA) {
    throw new DomainError('CRITERIA_INVALID', `Tối đa ${MAX_CRITERIA} tiêu chí`);
  }

  const names = new Set<string>();
  const normalized = list.map((c) => {
    const name = (c.criteriaName ?? '').trim();
    if (!name) throw new DomainError('CRITERIA_INVALID', 'Tên tiêu chí không được để trống');
    const key = name.toLocaleLowerCase('vi');
    if (names.has(key)) throw new DomainError('CRITERIA_INVALID', `Tiêu chí "${name}" bị trùng`);
    names.add(key);
    if (!Number.isInteger(c.weightPercent) || c.weightPercent < 1 || c.weightPercent > 100) {
      throw new DomainError('CRITERIA_INVALID', `Trọng số của "${name}" phải là số nguyên từ 1 đến 100`);
    }
    return { criteriaName: name, weightPercent: c.weightPercent, isKnockout: Boolean(c.isKnockout) };
  });

  const sum = normalized.reduce((acc, c) => acc + c.weightPercent, 0);
  if (sum !== 100) {
    throw new DomainError('CRITERIA_WEIGHT_SUM', `Tổng trọng số các tiêu chí phải bằng 100% (hiện tại ${sum}%)`, 400, { sum });
  }
  return normalized;
}

