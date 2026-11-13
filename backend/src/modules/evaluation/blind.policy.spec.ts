import { resolveVisibility } from './blind.policy';

const A = 1;
const B = 2;
const HR = 99;

describe('Blind Lock (D10)', () => {
  const partial = [
    { interviewerId: A, hasSubmitted: true },
    { interviewerId: B, hasSubmitted: false },
  ];

  it('S4.5 — B chưa nộp không thấy phiếu của A', () => {
    const v = resolveVisibility(B, partial);
    expect(v.mode).toBe('OWN_ONLY');
    expect(v.visibleInterviewerIds).toEqual([]);
  });

  it('S4.6 — A đã nộp chỉ thấy phiếu của chính A', () => {
    const v = resolveVisibility(A, partial);
    expect(v.mode).toBe('OWN_ONLY');
    expect(v.visibleInterviewerIds).toEqual([A]);
  });

  it('S4.7 — HR chỉ thấy tiến độ 1/2', () => {
    const v = resolveVisibility(HR, partial);
    expect(v).toMatchObject({ mode: 'PROGRESS_ONLY', visibleInterviewerIds: [], submittedCount: 1, panelSize: 2 });
  });

  it('S4.8 — nộp đủ thì mọi người thấy toàn bộ', () => {
    const full = partial.map((p) => ({ ...p, hasSubmitted: true }));
    for (const viewer of [A, B, HR]) {
      expect(resolveVisibility(viewer, full)).toMatchObject({ mode: 'FULL', visibleInterviewerIds: [A, B] });
    }
  });

  it('hội đồng rỗng không bao giờ được coi là đã nộp đủ', () => {
    expect(resolveVisibility(HR, []).mode).toBe('PROGRESS_ONLY');
  });
});

