// 증적 판정 줄 검사 — 확정만 세고 미확정은 따로 묶는다. 화면의 미확정 글자와 같은 말을 한다 (도메인/리포팅 「미확정 항목은 따로 묶는다」 · 실행 §3.2)
import { describe, expect, it } from 'vitest';

import { 미확정글자 } from '../web/unconfirmed.js';
import type { EvidenceItem } from './collect.js';
import { 판정줄 } from './summary.js';

function 항목(status: EvidenceItem['status'], unconfirmed: string | null = null): EvidenceItem {
  return {
    tcId: 'X-1',
    tcName: 'x',
    platform: 'desktop',
    attempt: 1,
    status,
    durationMs: 1,
    notRunReason: null,
    unconfirmed,
    precondition: [],
    params: [],
    expected: [],
    steps: [],
  };
}

describe('판정줄 — 증적 머리의 한 줄', () => {
  it('미확정이 없으면 확정 숫자만 — 0 도 적는다(증적은 숫자를 숨기지 않는다)', () => {
    expect(판정줄([항목('PASS'), 항목('PASS'), 항목('FAIL')])).toBe('통과 2 · 실패 1 · 미실행 0');
  });

  it('미확정은 확정 숫자에서 빼고 뒤에 묶는다 — 묶음 안의 0 칸은 뺀다', () => {
    const 줄 = 판정줄([항목('PASS'), 항목('FAIL', '다름 D1'), 항목('PASS', '다름 D2'), 항목('PASS', '다름 D3')]);
    expect(줄).toBe('통과 1 · 실패 0 · 미실행 0 · 미확정 3(통과 2 · 실패 1)');
  });

  it('미확정만 돌린 실행도 확정 칸을 0 으로 적는다', () => {
    expect(판정줄([항목('PASS', '다름')])).toBe('통과 0 · 실패 0 · 미실행 0 · 미확정 1(통과 1)');
  });

  it('회차를 접지 않고 항목 한 행을 하나로 센다 — 실행 화면 counts 와 같다', () => {
    const 두회차 = [{ ...항목('PASS'), attempt: 1 }, { ...항목('FAIL'), attempt: 2 }];
    expect(판정줄(두회차)).toBe('통과 1 · 실패 1 · 미실행 0');
  });

  it('돌지 못한 항목(NOT_RUN)은 미실행이다 — 화면은 중단·저장 실패 행을 running 으로 센다(증적은 끝난 실행만 만든다)', () => {
    expect(판정줄([항목('NOT_RUN'), 항목('NA'), 항목('NOT_RUN', '다름')])).toBe('통과 0 · 실패 0 · 미실행 2 · 미확정 1(미실행 1)');
  });

  it('미확정 묶음 글자는 화면(web/unconfirmed.ts)과 같다', () => {
    const 들 = [항목('PASS', 'a'), 항목('PASS', 'b'), 항목('FAIL', 'c'), 항목('NA', 'd'), 항목('PASS')];
    const 화면 = 미확정글자(
      { total: 5, pass: 1, fail: 0, na: 0, running: 0, unconfirmed: { total: 4, pass: 2, fail: 1, na: 1 } },
      'ko',
    );
    expect(판정줄(들).endsWith(` · ${화면}`)).toBe(true);
  });
});
