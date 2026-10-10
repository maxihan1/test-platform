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

  it('옛 표면 줄 수와 갈아쓰기 지침 자리를 싣는다 · 옛 줄이 없으면 안 싣는다 (PRD-F3-03)', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], { 폴더: 'mkt', 서버들: [] }, undefined, undefined, { 사본: '/w/ledger.json', 요약: '요구 3', 옛줄: 610 });
    expect(글).toMatch(/옛 표다.*요구 줄 610개.*references\/prd\.md` §6/);
    expect(줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, { 사본: '/w/ledger.json', 요약: '요구 3', 옛줄: 0 })).not.toContain('옛 표다');
  });

  it('원장이 없으면 까닭을 싣고 관문 0 을 건너뛰라고 한다', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, { 없음: '글자본이 있는 자료가 없다 — 화면.pdf(PDF)' });
    expect(글).toContain('원장 없음 — 글자본이 있는 자료가 없다 — 화면.pdf(PDF)');
    expect(글).toMatch(/관문 0 은 건너뛴다/);
  });

  it('이어 작성이면 원장 절 뒤에 이어 작성 절을 싣는다 — 원본 번호 · 남은 수 · 앞 번호 · 사본 경로', () => {
    const 남은 = Array.from({ length: 25 }, (_, i) => `REQ-A-${String(i + 1)}`);
    const 글 = 줄프롬프트(
      것,
      'MKT',
      [],
      { 폴더: 'mkt', 서버들: [] },
      undefined,
      undefined,
      { 사본: '/w/ledger.json', 요약: '요구 172' },
      { 원본: 5873, 남은, 사본: '/w/자료/continue.json' },
    );
    expect(글.indexOf('--- 이어 작성 ---')).toBeGreaterThan(글.indexOf('--- 원장 ---'));
    expect(글).toContain('작성 요청 5873');
    expect(글).toContain('남은 요구 25개');
    expect(글).toContain('REQ-A-20');
    expect(글).not.toContain('REQ-A-21');
    expect(글).toContain('/w/자료/continue.json');
    expect(글).toContain('references/continue.md');
  });

  it('이어 작성이 아니면 이어 작성 절이 없다', () => {
    expect(줄프롬프트(것, 'MKT', [])).not.toContain('--- 이어 작성 ---');
  });
});

describe('줄프롬프트 — 진행 메모 (도메인/작성 §7 「이어하기」 · 2026-10-04)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };
  const 메모 = '/w/author-1/assets/resume-memo.md';

  it('메모 경로를 주면 단계마다 고쳐 쓰라고 공통 절에 싣는다', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, 메모);
    expect(글).toContain(메모);
    expect(글).toMatch(/진행 메모/);
    expect(글).toContain('SKILL.md');
  });

  it('이어받은 실행이면 거절 까닭 다음에 메모를 읽고, 관문은 전부 다시 돈다고 이어하기 절에 싣는다', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, { 번호: 7, 이유: 'LIMIT', 까닭: null }, undefined, undefined, 메모);
    const 절 = 글.slice(글.indexOf('--- 이어하기 ---'));
    expect(절).toContain(메모);
    expect(절).toMatch(/관문.*다시/);
  });

  it('메모 경로가 없으면 메모 줄이 없다', () => {
    expect(줄프롬프트(것, 'MKT', [])).not.toMatch(/진행 메모/);
  });
});

describe('줄프롬프트 — 표준 기획서 절 (도메인/작성 §3.6 「★ 표준 기획서」 「옮기기」)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };

  it('지금 판 경로 · 판 번호 · 결과 자리 · 원본 원장 · 원장 다시 만들기 명령과 참고 파일을 싣는다', () => {
    const 입력 = { 지금판: '/w/자료/prd-current.json', 결과: '/w/자료/out/prd.json', 판: 3, 항목수: 41, 원본: { 사본: '/w/자료/source-ledger.json', 요약: '요구 172' }, 자료폴더: '/w/자료' };
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, undefined, 입력);
    expect(글).toContain('--- 표준 기획서 ---');
    expect(글).toContain('판 3 · 항목 41');
    expect(글).toContain('/w/자료/prd-current.json');
    expect(글).toContain('/w/자료/out/prd.json');
    expect(글).toContain('/w/자료/source-ledger.json — 요구 172');
    expect(글).toContain('npm run prd:ledger -- /w/자료');
    expect(글).toContain('references/prd.md');
    expect(줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, undefined, { ...입력, 원본: { 없음: '글자본이 있는 자료가 없다' } })).toContain('원본 원장(근거 번호를 적을 때 본다): 없음 — 글자본이 있는 자료가 없다');
  });

  it('옮기지 않는 요청에는 절이 없다', () => {
    expect(줄프롬프트(것, 'MKT', [])).not.toContain('--- 표준 기획서 ---');
  });
});
