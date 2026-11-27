// 줄 프롬프트 원장 절 검사 — 에이전트가 자식에게 원장을 어떻게 넘기는지 (도메인/작성 §3.6 「★ 원장」)
// authoring-agent.test.ts 가 300줄을 넘어 뗐다 (2026-09-30)
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 줄프롬프트 } from './authoring-prompt.js';

describe('줄프롬프트 — 대상 서버 목록의 계정 줄 (도메인/작성 §3.6 「★ 역할별 계정」)', () => {
  const 서버들 = [
    { env: 'dev', baseUrl: 'https://dev.mkt.test' },
    { env: 'qa', baseUrl: 'https://qa.mkt.test' },
  ];
  const 계정 = { env: 'qa', baseUrl: 'https://qa.mkt.test', role: '일반 회원', loginId: 'u', loginPassword: 'p' };

  it('정방향이면 집기 계정의 줄에만 돌려 볼 주소라고 붙인다', () => {
    const 글 = 줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문', accounts: [계정] }, 'MKT', [], { 폴더: 'mkt', 서버들 });
    expect(글).toContain('  - qa — https://qa.mkt.test (테스트 계정이 이 서버 것이다');
    expect(글).toContain('  - dev — https://dev.mkt.test\n');
  });

  it('계정이 여러 줄 것이면(반영 행) 붙이지 않는다', () => {
    const 두줄 = [계정, { ...계정, env: 'dev', baseUrl: 'https://dev.mkt.test' }];
    expect(줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문', accounts: 두줄 }, 'MKT', [], { 폴더: 'mkt', 서버들 })).not.toContain('테스트 계정이 이 서버 것이다');
  });

  it('계정이 없거나 대조 행이면 붙이지 않는다', () => {
    expect(줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문' }, 'MKT', [], { 폴더: 'mkt', 서버들 })).not.toContain('테스트 계정이 이 서버 것이다');
    const 대조 = { env: 'qa', baseUrl: 'https://qa.mkt.test', startUrl: null, loginId: 'u', loginPassword: 'p' };
    expect(줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문', accounts: [계정], target: 대조 }, 'MKT', [], { 폴더: 'mkt', 서버들 })).not.toContain('테스트 계정이 이 서버 것이다');
  });
});

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
    expect(글).toContain('npm run -s authoring:check -- 마지막 /w/자료/ledger.json MKT mkt');
    expect(글).toContain('npm run check:ledger -- /w/자료/ledger.json docs/cases/MKT.md --agent');
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

describe('줄프롬프트 — 진행 글 언어 (PRD-F9-15)', () => {
  it('모든 요청의 공통 절에 진행 글은 한국어 해요체라고 싣는다 — 기획서 절보다 앞', () => {
    const 글 = 줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문' }, 'MKT', []);
    expect(글.indexOf('한국어 해요체')).toBeGreaterThan(-1);
    expect(글.indexOf('한국어 해요체')).toBeLessThan(글.indexOf('--- 기획서 ---'));
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

  it('이어받은 실행이면 거절 까닭 다음에 메모를 읽고, 관문 0 · 1 · 2 · 4 는 다시 돌고 3회 실행은 기록으로 이어 간다고 싣는다 (2026-10-19)', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, { 번호: 7, 이유: 'LIMIT', 까닭: null }, undefined, undefined, 메모);
    const 절 = 글.slice(글.indexOf('--- 이어하기 ---'));
    expect(절).toContain(메모);
    expect(절).toMatch(/관문 0 · 1 · 2 · 4 는 .*다시/);
    expect(절).toMatch(/3회 실행은 .*기록으로 이어/);
  });

  it('메모 경로가 없으면 메모 줄이 없다', () => {
    expect(줄프롬프트(것, 'MKT', [])).not.toMatch(/진행 메모/);
  });
});

describe('줄프롬프트 — 표준 기획서 절 (도메인/작성 §3.6 「★ 표준 기획서」 「옮기기」)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };

  it('현재 버전 경로 · 버전 번호 · 결과 자리 · 원본 원장 · 원장 다시 만들기 명령과 참고 파일을 싣는다', () => {
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

describe('줄프롬프트 — 반영 절 (도메인/작성 §3.6 「사람이 고칠 때」 「고친 요구만 다시 작성」)', () => {
  const 것 = { id: 9, kind: 'AUTHOR' as const, params: { prdApply: true } };
  const 계획 = { 기준판: 3, 지금판: 5, 다시씀: [], 새항목: ['X-REQ-004'], 지움: [] };

  it('자료가 없어도 빈 기획서 절을 싣지 않고, 반영 절에 셈 · 사본 경로 · 참고 파일을 싣는다', () => {
    const 글 = 줄프롬프트(것, 'X', [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, { 계획, 사본: '/work/apply.json' });
    expect(글).not.toContain('--- 기획서 ---');
    expect(글).toContain('--- 반영 ---');
    expect(글).toContain('다시 씀 0 · 새 항목 1 · 지움 0');
    expect(글).toContain('/work/apply.json');
    expect(글).toContain('references/apply.md');
  });

  it('반영이 아니면 절이 없다', () => {
    expect(줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문' }, 'X', [])).not.toContain('--- 반영 ---');
  });
});

describe('줄프롬프트 — 서비스 가이드 절 (§3.6 「★ 서비스 가이드」)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };

  it('판이 있으면 버전 번호 · guide.md 자리 · 요약 자리 · 참고 파일을 싣는다', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { 판: 4, 글: '/w/자료/guide/guide.md' });
    expect(글).toContain('--- 서비스 가이드 ---');
    expect(글).toContain('(판 4): /w/자료/guide/guide.md');
    expect(글).toContain('`docs/cases/MKT.guide.md`');
    expect(글).toContain('references/guide.md');
    expect(글).toContain('기대값의 근거가 아니다');
  });

  it('판이 0 이어도 요약 자리를 알린다 — 「배운 것」은 가이드가 없어도 쌓인다 (PRD-F11-05)', () => {
    const 글 = 줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { 판: 0, 글: '/w/자료/guide/guide.md' });
    expect(글).toContain('서비스 가이드가 없다(판 0).');
    expect(글).not.toContain('/w/자료/guide/guide.md');
    expect(글).toContain('`docs/cases/MKT.guide.md`');
  });
});

describe('줄프롬프트 — 서비스 지도 절 (§3.6 「서비스 지도」 · PRD-F14-05)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };
  const 부르기 = (자료폴더: string): string =>
    줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 자료폴더);

  it('자료 폴더에 api-map.txt 가 있을 때만 그 자리와 보조에게 넘기라는 줄을 싣는다', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'prompt-map-'));
    try {
      expect(부르기(폴더)).not.toContain('--- 서비스 지도 ---');
      writeFileSync(join(폴더, 'api-map.txt'), 'GET s.test/api/goods/:n\n');
      const 글 = 부르기(폴더);
      expect(글).toContain('--- 서비스 지도 ---');
      expect(글).toContain(join(폴더, 'api-map.txt'));
      expect(글).toContain('fanout.md §4');
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});

describe('줄프롬프트 — 탐색 플레이 (도메인/게임 §3.10 「탐색 플레이 · 조작 맵」 · GAME-F5-05)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };
  const 게임 = { 글: '/w/자료/game-screen.txt', 게임: true as const };
  const 부르기 = (탐색?: { 까지: true } | { 끝: string }, 이어하기?: { 번호: number; 이유: string | null; 까닭: string | null }) =>
    줄프롬프트(것, 'ASH', [], undefined, undefined, 이어하기, undefined, undefined, undefined, undefined, undefined, undefined, 게임, '/w/자료', 탐색);

  it('첫 세션은 탐색 플레이까지만 — 목표 파일을 먼저 적고 경로 검색 · 맵 행 · 스스로 검사 뒤 케이스 없이 끝내라고 싣는다', () => {
    const 절 = 부르기({ 까지: true }).split('--- 탐색 플레이 ---')[1] ?? '';
    expect(절).toContain('`[단계] 탐색 플레이`');
    expect(절).toContain('요구별 케이스 목록 · 케이스는 쓰지 마라');
    expect(절).toContain('`/w/자료/game-explore.json` 에 먼저 적는다');
    expect(절).toContain('`npx tsx scripts/authoring-game-route.ts /w/자료 <열쇠…>`');
    expect(절).toContain('`/w/자료/game-route.json` 에 행을 적는다');
    expect(절).toContain('`npx tsx scripts/authoring-explore.ts /w/자료` 가 0 으로 끝날 때까지');
    expect(절).toContain('시간 상한은 없다');
  });

  it('체크포인트를 지난 세션은 탐색을 다시 하지 않고 케이스 목록부터 — 결과 줄을 결과 요약에 그대로 넣으라고 싣는다', () => {
    const 글 = 부르기({ 끝: '탐색 플레이: 목표 2개 — 경로 확보 2 · 진행 불가 0' }, { 번호: 1, 이유: 'EXPLORED', 까닭: null });
    expect(글).toContain('멈춘 까닭: 탐색 플레이를 마침');
    const 절 = 글.split('--- 탐색 플레이 ---')[1] ?? '';
    expect(절).toContain('창 훑기 · 탐색 플레이를 다시 하지 말고 「요구별 케이스 목록 쓰기」부터');
    expect(절).toContain('fields.fn');
    expect(절).toContain('결과 요약에 이 줄을 그대로 넣어라: 탐색 플레이: 목표 2개 — 경로 확보 2 · 진행 불가 0');
  });

  it('탐색을 안 하는 작성에는 절이 없다', () => {
    expect(부르기()).not.toContain('--- 탐색 플레이 ---');
  });
});
