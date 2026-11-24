// 「기대 결과」 확인 문장 고르기 검사 (도메인/리포팅 §8.4 「기대 결과」)

import { describe, expect, it } from 'vitest';

import { 기대문장 } from './expectedLines.js';
import type { StepResult } from './api.js';

const 절차 = (...문장들: [string, 'PASS' | 'FAIL' | 'NA'][]): Pick<StepResult, 'assertions'> => ({
  assertions: 문장들.map(([statement, status]) => ({ statement, status }) as StepResult['assertions'][number]),
});

describe('기대문장', () => {
  it('박제한 문장이 있으면 그것이다 — 돈 절차와 달라도 박제가 이긴다', () => {
    expect(기대문장(['주문이 접수된다', '메일이 간다'], [절차(['다른 문장', 'PASS'])])).toEqual(['주문이 접수된다', '메일이 간다']);
  });

  it('박제가 빈 목록이어도 그대로다 — 읽었는데 문장이 없는 케이스다', () => {
    expect(기대문장([], [절차(['돈 절차의 문장', 'PASS'])])).toEqual([]);
  });

  it('박제가 없으면(null · 없음) 돈 절차에서 판정이 난 문장을 차례대로 쓴다', () => {
    const 단계 = [절차(['로그인된다', 'PASS']), 절차(['잔액이 보인다', 'FAIL'])];
    expect(기대문장(null, 단계)).toEqual(['로그인된다', '잔액이 보인다']);
    expect(기대문장(undefined, 단계)).toEqual(['로그인된다', '잔액이 보인다']);
  });

  it('돈 절차에서는 판정 없는 참고 줄(NA)을 빼고 같은 문장은 한 번만 적는다', () => {
    const 단계 = [절차(['로그인된다', 'PASS'], ['참고 줄', 'NA']), 절차(['로그인된다', 'PASS'])];
    expect(기대문장(null, 단계)).toEqual(['로그인된다']);
  });

  it('박제도 판정 난 문장도 없으면 빈 목록이다', () => {
    expect(기대문장(null, [])).toEqual([]);
    expect(기대문장(null, [절차(['참고 줄', 'NA'])])).toEqual([]);
  });
});
