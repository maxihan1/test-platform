// 남은 리스크 AI 결과 — 두 묶음 개조식 글 · 빈 묶음 · 배포 판단 말 거르기 · 일 세울지 · 재료 자르기
import { describe, expect, it } from 'vitest';

import { 리스크일세울까, 줄이기 } from './qaReportAi.js';
import { 리스크거르기, 리스크모양 } from './qaReportAiShape.js';

describe('남은 리스크 결과', () => {
  it('두 묶음을 개조식 글 하나로 짓고 빈 묶음은 「확인된 리스크 없음」, 근거는 줄 끝 괄호다', () => {
    const r = 리스크모양.parse({ functional: [{ text: '결제 실패 2건이 판정 전입니다', refs: ['DM-FN-012', 'RUN 7'] }], nonFunctional: [] });
    expect(리스크거르기(r)).toEqual({
      output: { ...r, text: '기능 리스크\n- 결제 실패 2건이 판정 전입니다 (DM-FN-012 · RUN 7)\n비기능 리스크\n- 확인된 리스크 없음' },
    });
  });

  it('배포 판단 말이 섞이면 받지 않는다', () => {
    for (const 글 of ['이대로 배포 가능합니다', '출시 보류를 권합니다', 'go/no-go 판단: no-go']) {
      expect(리스크거르기({ functional: [{ text: 글, refs: [] }], nonFunctional: [] })).toEqual({ error: '배포 판단 말이 들어 있습니다' });
    }
    expect('error' in 리스크거르기({ functional: [{ text: '배포 뒤 확인한 사람이 없습니다', refs: [] }], nonFunctional: [] })).toBe(false);
  });

  it('묶음마다 10줄 · 줄마다 300자를 넘거나 묶음이 빠지면 모양이 틀렸다', () => {
    expect(리스크모양.safeParse({ functional: Array.from({ length: 11 }, () => ({ text: 'a' })), nonFunctional: [] }).success).toBe(false);
    expect(리스크모양.safeParse({ functional: [{ text: 'a'.repeat(301) }], nonFunctional: [] }).success).toBe(false);
    expect(리스크모양.safeParse({ functional: [] }).success).toBe(false);
  });
});

describe('남은 리스크 일', () => {
  const 글 = { first: 'a', current: 'a', editedBy: null, editedAt: null };
  it('도는 실행이 없을 때, 첫 장이 바뀌었거나 일이 없을 때만 세운다. 사람이 고친 글이 있으면 안 세운다', () => {
    expect(리스크일세울까({ running: 0, 같은첫장: false, ai: 글, aiJobId: '1' })).toBe(true);
    expect(리스크일세울까({ running: 0, 같은첫장: true, ai: null, aiJobId: null })).toBe(true);
    expect(리스크일세울까({ running: 0, 같은첫장: true, ai: 글, aiJobId: '1' })).toBe(false);
    expect(리스크일세울까({ running: 1, 같은첫장: false, ai: null, aiJobId: null })).toBe(false);
    expect(리스크일세울까({ running: 0, 같은첫장: false, ai: { ...글, editedBy: '이', editedAt: 'x' }, aiJobId: '1' })).toBe(false);
  });

  it('재료 배열은 100개에서 자르고 잘렸다고 표시한다', () => {
    const 표 = { 잘림: false };
    const 값 = 줄이기({ a: { b: Array.from({ length: 150 }, (_, i) => i) }, c: [1] }, 표) as { a: { b: number[] }; c: number[] };
    expect(값.a.b).toHaveLength(100);
    expect(값.c).toEqual([1]);
    expect(표.잘림).toBe(true);
  });
});
