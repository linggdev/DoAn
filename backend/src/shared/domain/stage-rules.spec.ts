import { applyStageConfig, buildDefaultStages, nextStage } from './stage-rules';

describe('stage-rules (D07)', () => {
  it('S2.4 — bộ vòng mặc định đủ 7 vòng theo thứ tự cố định', () => {
    const codes = buildDefaultStages().map((s) => s.stageCode);
    expect(codes).toEqual(['APPLIED', 'SCREENING', 'TEST', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']);
  });

  it('S2.6 — tắt TEST và đổi tên INTERVIEW: còn 6 vòng, thứ tự giữ nguyên', () => {
    const stages = applyStageConfig([
      { stageCode: 'TEST', enabled: false },
      { stageCode: 'INTERVIEW', enabled: true, stageName: 'Phỏng vấn kỹ thuật' },
    ]);
    expect(stages.map((s) => s.stageCode)).toEqual(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']);
    expect(stages.find((s) => s.stageCode === 'INTERVIEW')).toMatchObject({ stageName: 'Phỏng vấn kỹ thuật', stageOrder: 4 });
  });

  it.each(['APPLIED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'])('S2.6 — không thể tắt vòng bắt buộc %s', (code) => {
    expect(() => applyStageConfig([{ stageCode: code, enabled: false }])).toThrow(
      expect.objectContaining({ code: 'STAGE_REQUIRED' }),
    );
  });

  it('từ chối mã vòng lạ hoặc khai báo trùng', () => {
    expect(() => applyStageConfig([{ stageCode: 'FOO', enabled: true }])).toThrow(expect.objectContaining({ code: 'STAGE_INVALID' }));
    expect(() =>
      applyStageConfig([
        { stageCode: 'TEST', enabled: true },
        { stageCode: 'TEST', enabled: false },
      ]),
    ).toThrow(expect.objectContaining({ code: 'STAGE_INVALID' }));
  });

  it('nextStage bỏ qua vòng tuỳ chọn đã tắt và không bao giờ trả REJECTED', () => {
    const stages = applyStageConfig([
      { stageCode: 'SCREENING', enabled: false },
      { stageCode: 'TEST', enabled: false },
    ]);
    const applied = stages.find((s) => s.stageCode === 'APPLIED')!;
    const hired = stages.find((s) => s.stageCode === 'HIRED')!;
    expect(nextStage(stages, applied)?.stageCode).toBe('INTERVIEW');
    expect(nextStage(stages, hired)).toBeNull();
  });
});

