// 프로시저 안 케이스의 Issue Bunker 이슈 본문 — 프로시저 줄 · 처음부터의 재현 단계 · 앞서 실패한 케이스 · 후속 케이스 · 앞 케이스부터 접기 (도메인/BTS 「테스트 프로시저 — 이슈 등록과 이슈 처리」)

import { describe, expect, it } from 'vitest';

import { 본문상한, 이슈본문, type 실패재료, type 프로시저재료 } from './failBody.js';

const 프로시저 = (덮어쓰기: Partial<프로시저재료> = {}): 프로시저재료 => ({
  id: 'MTA-TP-012',
  name: '글쓰기 — 입력 제한부터 게시까지',
  seq: 3,
  total: 4,
  앞케이스: [
    { tcId: 'MTA-FN-101', tcName: '글쓰기 창 열기', 판정: 'Pass', steps: ['앱을 연다', '글쓰기를 누른다'] },
    { tcId: 'MTA-FN-102', tcName: '500자 제한', 판정: 'Fail', steps: ['501자를 넣는다'] },
  ],
  앞실패: ['MTA-FN-102'],
  후속: [{ tcId: 'MTA-FN-104', tcName: '게시 확인' }],
  ...덮어쓰기,
});

const 재료 = (p: 프로시저재료): 실패재료 => ({
  애플리케이션: 'Mastodon 앱',
  tcId: 'MTA-FN-103',
  tcName: '사진 첨부',
  env: 'qa',
  build: '124',
  device: { model: 'SM-S921N', osVersion: '14', appVersion: '4.3.0', appBuild: '124' },
  steps: [
    { title: '사진 버튼을 누른다', status: 'PASS' },
    { title: '사진을 고른다', status: 'FAIL' },
  ],
  reqs: [],
  확인: { statement: '사진이 붙는다', expected: 1, actual: 0 },
  원인: '기대 결과와 다릅니다',
  네트워크: null,
  콘솔: null,
  폰로그: '없음',
  결과주소: 'https://qahub.example.com/#/runs/900/items/9001',
  꼬리표: '결함 가능성 높음',
  화면: null,
  둘째: null,
  프로시저: p,
});

describe('프로시저 안 케이스의 이슈 본문', () => {
  it('프로시저 줄 · 앞서 실패한 케이스 · 후속 케이스를 적고 재현 단계를 프로시저 처음부터 번호를 이어 싣는다', () => {
    const 글 = 이슈본문(재료(프로시저()));
    expect(글).toContain('**프로시저** — MTA-TP-012 글쓰기 — 입력 제한부터 게시까지 · 3번째 / 4');
    expect(글).toContain('**앞서 실패한 케이스** — MTA-FN-102');
    expect(글).toContain('**후속 케이스** — MTA-FN-104 게시 확인');
    const 재현 = 글.slice(글.indexOf('### 재현 단계'), 글.indexOf('### 기대 (PRD)'));
    expect(재현.trim().split('\n')).toEqual([
      '### 재현 단계',
      '**MTA-FN-101 글쓰기 창 열기 — Pass**',
      '1. 앱을 연다',
      '2. 글쓰기를 누른다',
      '**MTA-FN-102 500자 제한 — Fail**',
      '3. 501자를 넣는다',
      '**MTA-FN-103 사진 첨부 — Fail**',
      '4. 사진 버튼을 누른다',
      '5. 사진을 고른다 ← 여기서 실패',
    ]);
  });

  it('앞서 실패한 케이스 · 후속 케이스가 없으면 그 줄을 적지 않는다', () => {
    const 글 = 이슈본문(재료(프로시저({ seq: 1, 앞케이스: [], 앞실패: [], 후속: [] })));
    expect(글).toContain('· 1번째 / 4');
    expect(글).not.toContain('앞서 실패한 케이스');
    expect(글).not.toContain('후속 케이스');
  });

  it('상한을 넘으면 앞 케이스의 절차를 한 줄씩으로 먼저 접고 실패한 케이스의 절차는 남긴다', () => {
    const 긴절차 = Array.from({ length: 400 }, (_, i) => `앞 절차 ${String(i)} ${'가'.repeat(40)}`);
    const 글 = 이슈본문(재료(프로시저({ 앞케이스: [{ tcId: 'MTA-FN-101', tcName: '글쓰기 창 열기', 판정: 'Pass', steps: 긴절차 }], 앞실패: [] })));
    expect(Buffer.byteLength(글, 'utf8')).toBeLessThanOrEqual(본문상한);
    expect(글).toContain('- MTA-FN-101 글쓰기 창 열기 — Pass');
    expect(글).toContain('앞서 돈 케이스의 절차는 Test Commander 실행 결과에서');
    expect(글).not.toContain('앞 절차 0');
    expect(글).toContain('2. 사진을 고른다 ← 여기서 실패');
  });
});
