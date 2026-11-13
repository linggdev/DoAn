import { DomainError } from './domain-error';

/** Trùng giá trị với enum Prisma `StageCode` nhưng không phụ thuộc Prisma (hàm thuần). */
export type StageCode = 'APPLIED' | 'SCREENING' | 'TEST' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface StageDef {
  stageCode: StageCode;
  stageName: string;
  stageOrder: number;
}

/** D07 — thứ tự cố định. REJECTED nằm ngoài luồng chính. */
export const STAGE_ORDER: Readonly<Record<StageCode, number>> = {
  APPLIED: 1,
  SCREENING: 2,
  TEST: 3,
  INTERVIEW: 4,
  OFFER: 5,
  HIRED: 6,
  REJECTED: 99,
};

export const REQUIRED_STAGES: readonly StageCode[] = ['APPLIED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
export const OPTIONAL_STAGES: readonly StageCode[] = ['SCREENING', 'TEST'];
export const TERMINAL_STAGES: readonly StageCode[] = ['HIRED', 'REJECTED'];

export const DEFAULT_STAGE_NAMES: Readonly<Record<StageCode, string>> = {
  APPLIED: 'Ứng tuyển',
  SCREENING: 'Sàng lọc',
  TEST: 'Kiểm tra',
  INTERVIEW: 'Phỏng vấn',
  OFFER: 'Đề nghị',
  HIRED: 'Trúng tuyển',
  REJECTED: 'Loại',
};

const ALL_CODES = Object.keys(STAGE_ORDER) as StageCode[];

export function isStageCode(value: string): value is StageCode {
  return (ALL_CODES as string[]).includes(value);
}

export function buildDefaultStages(): StageDef[] {
  return ALL_CODES.map((code) => ({
    stageCode: code,
    stageName: DEFAULT_STAGE_NAMES[code],
    stageOrder: STAGE_ORDER[code],
  })).sort((a, b) => a.stageOrder - b.stageOrder);
}

export interface StageConfigInput {
  stageCode: string;
  enabled: boolean;
  stageName?: string;
}

/**
 * Áp cấu hình bật/tắt + đổi tên của HR thành danh sách vòng hợp lệ.
 * Vòng không được nhắc tới giữ mặc định (bật). Vòng bắt buộc không thể tắt.
 */
export function applyStageConfig(input: StageConfigInput[]): StageDef[] {
  const seen = new Set<string>();
  const overrides = new Map<StageCode, StageConfigInput>();
  for (const item of input) {
    if (!isStageCode(item.stageCode)) {
      throw new DomainError('STAGE_INVALID', `Mã vòng không hợp lệ: ${item.stageCode}`);
    }
    if (seen.has(item.stageCode)) {
      throw new DomainError('STAGE_INVALID', `Vòng ${item.stageCode} bị khai báo trùng`);
    }
    seen.add(item.stageCode);
    if (!item.enabled && REQUIRED_STAGES.includes(item.stageCode)) {
      throw new DomainError('STAGE_REQUIRED', `Vòng "${DEFAULT_STAGE_NAMES[item.stageCode]}" là bắt buộc, không thể tắt`);
    }
    if (item.stageName !== undefined && item.stageName.trim().length === 0) {
      throw new DomainError('STAGE_INVALID', 'Tên vòng không được để trống');
    }
    overrides.set(item.stageCode, item);
  }

  return buildDefaultStages()
    .filter((s) => overrides.get(s.stageCode)?.enabled !== false)
    .map((s) => ({ ...s, stageName: overrides.get(s.stageCode)?.stageName?.trim() || s.stageName }));
}

/** Vòng kế tiếp trong luồng chính (bỏ qua REJECTED). null nếu không còn. */
export function nextStage<T extends { stageCode: string; stageOrder: number }>(stages: T[], current: T): T | null {
  const candidates = stages
    .filter((s) => s.stageCode !== 'REJECTED' && s.stageOrder > current.stageOrder)
    .sort((a, b) => a.stageOrder - b.stageOrder);
  return candidates[0] ?? null;
}

