// E2E 정식 실행이 장면을 찍을지 — 브라우저를 여는 웹 케이스 단계가 있는 실행만이다 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)

import type { ScenarioExecuteRequest } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 창단계있나 } from './runResult.js';

type 부품 = ScenarioExecuteRequest['parts'][number];
const 케이스 = (칸: Partial<부품> = {}): 부품 => ({ kind: 'case', tcId: 'XSL-001', params: {}, expected: {}, ...칸 }) as 부품;
const 기다리기: 부품 = { kind: 'wait', ms: 1 };

describe('창단계있나', () => {
  it('웹 케이스 단계가 하나라도 있으면 찍는다', () => {
    expect(창단계있나({ parts: [기다리기, 케이스()] })).toBe(true);
    expect(창단계있나({ parts: [케이스({ appStep: true }), 케이스()] })).toBe(true);
  });

  it('앱 · 게임 단계 · API 애플리케이션 케이스 · 케이스 아닌 단계만이면 안 찍는다 — 장면이 안 오는 빈 칸이 남는다', () => {
    expect(창단계있나({ parts: [] })).toBe(false);
    expect(창단계있나({ parts: [기다리기, 케이스({ appStep: true })] })).toBe(false);
    expect(창단계있나({ parts: [케이스({ apiDoc: {} as 부품['apiDoc'] })] })).toBe(false);
  });
});
