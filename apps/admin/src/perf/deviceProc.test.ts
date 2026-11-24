// 기기 성능의 프로시저 답 풀기 — 준비 절차의 구간 주인 · 판정 밖 사유를 한 번만 적기 (도메인/성능 §3.9 「기기 성능」)

import { describe, expect, it } from 'vitest';

import { 답풀기, 알릴말 } from './deviceProc.js';

const 절차 = (seq: number, tcId?: string) => ({ seq, title: `절차 ${seq}`, status: 'PASS' as const, durationMs: 100, assertions: [], ...(tcId !== undefined && { tcId }) });

describe('답풀기', () => {
  it('절차는 번호 차례로 놓고 tcId 가 없는 절차는 그 결과의 케이스 몫이다', () => {
    const 답 = 답풀기({ historyId: 1, durationMs: 300, results: [
      { tcId: 'A', status: 'PASS', durationMs: 100, steps: [절차(1)] },
      { tcId: 'B', status: 'PASS', durationMs: 200, steps: [절차(3, 'B'), 절차(2, 'B')] },
    ] });
    expect(답.steps.map((x) => [x.tcId, x.title])).toEqual([['A', '절차 1'], ['B', '절차 2'], ['B', '절차 3']]);
    expect(알릴말('S23', 1, 답)).toEqual([]);
  });

  it('못 간 답은 케이스마다 같은 사유라 판정 밖 오류를 따로 안 적는다', () => {
    const error = { message: '러너에 닿지 못했습니다' };
    const 답 = 답풀기({ historyId: 1, durationMs: 0, error, results: [{ tcId: 'A', status: 'NA', durationMs: 0, steps: [], error }, { tcId: 'B', status: 'NA', durationMs: 0, steps: [], error }] });
    expect(알릴말('S23', 2, 답)).toEqual(['S23 2회차 A 가 NA 로 끝났습니다 — 러너에 닿지 못했습니다', 'S23 2회차 B 가 NA 로 끝났습니다 — 러너에 닿지 못했습니다']);
  });

  it('끊긴 프로시저는 남은 케이스에 실린 사유를 다시 적지 않고, 결과마다 겹친 절차는 하나만 남긴다', () => {
    const error = { message: 'killed' };
    const 답 = 답풀기({ historyId: 1, durationMs: 100, error, results: [
      { tcId: 'A', status: 'PASS', durationMs: 100, steps: [절차(1)] },
      { tcId: 'B', status: 'NA', durationMs: 0, steps: [절차(1)], error },
    ] });
    expect(답.steps.map((x) => x.tcId)).toEqual(['A']);
    expect(알릴말('S23', 1, 답)).toEqual(['S23 1회차 B 가 NA 로 끝났습니다 — killed']);
  });

  it('판정이 다 난 뒤 프로세스가 실패로 끝났으면 그 사유를 한 줄 더 적는다', () => {
    const 답 = 답풀기({ historyId: 1, durationMs: 100, error: { message: 'exit 1' }, results: [{ tcId: 'A', status: 'PASS', durationMs: 100, steps: [절차(1)] }] });
    expect(알릴말('S23', 1, 답)).toEqual(['S23 1회차 테스트 프로시저 실행 오류 — exit 1']);
  });
});
