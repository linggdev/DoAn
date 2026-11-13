/**
 * Blind Evaluation Lock (D10) — HÀM THUẦN quyết định ai được thấy phiếu nào.
 *  - Hội đồng đã nộp đủ  → FULL: thấy mọi phiếu.
 *  - Chưa đủ, người xem thuộc hội đồng → OWN_ONLY: chỉ phiếu của chính mình.
 *  - Chưa đủ, người xem ngoài hội đồng (HR/Admin/HM) → PROGRESS_ONLY: chỉ tiến độ, không điểm.
 */
export type BlindMode = 'FULL' | 'OWN_ONLY' | 'PROGRESS_ONLY';

export interface PanelSeat {
  interviewerId: number;
  hasSubmitted: boolean;
}

export interface Visibility {
  mode: BlindMode;
  allSubmitted: boolean;
  visibleInterviewerIds: number[];
  submittedCount: number;
  panelSize: number;
}

export function resolveVisibility(viewerId: number, panel: PanelSeat[]): Visibility {
  const submittedCount = panel.filter((p) => p.hasSubmitted).length;
  const allSubmitted = panel.length > 0 && submittedCount === panel.length;
  const base = { allSubmitted, submittedCount, panelSize: panel.length };

  if (allSubmitted) {
    return { ...base, mode: 'FULL', visibleInterviewerIds: panel.map((p) => p.interviewerId) };
  }
  const seat = panel.find((p) => p.interviewerId === viewerId);
  if (seat) {
    return { ...base, mode: 'OWN_ONLY', visibleInterviewerIds: seat.hasSubmitted ? [viewerId] : [] };
  }
  return { ...base, mode: 'PROGRESS_ONLY', visibleInterviewerIds: [] };
}

