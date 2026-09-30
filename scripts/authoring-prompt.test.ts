// 줄 프롬프트 원장 절 검사 — 에이전트가 자식에게 원장을 어떻게 넘기는지 (도메인/작성 §3.6 「★ 원장」)
// authoring-agent.test.ts 가 300줄을 넘어 뗐다 (2026-09-30)
import { describe, expect, it } from 'vitest';

import { 줄프롬프트 } from './authoring-prompt.js';

describe('줄프롬프트 — 원장 절 (도메인/작성 §3.6 「★ 원장」)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };

  it('원장이 있으면 사본 경로 · 셈 · 관문 0 명령을 싣는다', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], { 폴더: 'mkt', 서버들: [] }, undefined, undefined, {
      사본: '/w/자료/ledger.json',
      요약: '요구 172 · 번호 가족 REQ-COM 14',
    });
    expect(글).toContain('--- 원장 ---');
    expect(글).toContain('/w/자료/ledger.json');
    expect(글).toContain('요구 172 · 번호 가족 REQ-COM 14');
    expect(글).toContain('npm run check:ledger -- /w/자료/ledger.json docs/cases/MKT.md --tests tests/mkt --agent');
    expect(글).toMatch(/관문 0/);
  });

  it('빠져도 올리기를 거절하지 않고 셈에 남는다고 알린다 — 그래도 관문 0 을 초록으로 (2026-09-30 게이트 1)', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], { 폴더: 'mkt', 서버들: [] }, undefined, undefined, { 사본: '/w/ledger.json', 요약: '요구 3' });
    expect(글).not.toContain('올리기 거절');
    expect(글).toMatch(/거절하지 않고.*「빠짐」.*관문 0 을 초록으로/);
    expect(글).not.toContain('ledger-missing');
  });

  it('원장이 없으면 까닭을 싣고 관문 0 을 건너뛰라고 한다', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, { 없음: '글자본이 있는 자료가 없다 — 화면.pdf(PDF)' });
    expect(글).toContain('원장 없음 — 글자본이 있는 자료가 없다 — 화면.pdf(PDF)');
    expect(글).toMatch(/관문 0 은 건너뛴다/);
  });
});
