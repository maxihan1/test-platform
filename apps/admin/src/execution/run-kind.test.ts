// 실행 종류 판정 — 케이스 번호로 종류를 정하고, 섞이면 모르고, 정해진 시간 실행을 종류별로 나눈다 (SPEC 공통/4-데이터모델 「실행 종류」)

import { describe, expect, it } from 'vitest';

import { 목록종류읽기, 실행종류, 종류별로나눈다, 종류조건 } from './runKind.js';

describe('실행종류', () => {
  it('UI 번호만이면 UI, 옛 꼴 · FN 번호면 FN 이다', () => {
    expect(실행종류(['PAY-UI-001', 'PAY-UI-002'])).toBe('UI');
    expect(실행종류(['PAY-041', 'PAY-FN-042'])).toBe('FN');
  });

  it('섞이면 null 이다', () => {
    expect(실행종류(['PAY-UI-001', 'PAY-041'])).toBeNull();
  });
});

describe('종류별로나눈다', () => {
  it('UI · 기능 두 묶음으로 나누고 빈 묶음은 내지 않는다', () => {
    const 묶음 = 종류별로나눈다([{ tcId: 'A-UI-001' }, { tcId: 'A-001' }, { tcId: 'A-FN-002' }]);
    expect(묶음.map((m) => [m.kind, m.items.map((i) => i.tcId)])).toEqual([
      ['UI', ['A-UI-001']],
      ['FN', ['A-001', 'A-FN-002']],
    ]);
    expect(종류별로나눈다([{ tcId: 'A-001' }]).map((m) => m.kind)).toEqual(['FN']);
    expect(종류별로나눈다([])).toEqual([]);
  });
});

describe('목록 종류', () => {
  it('ui · fn · scenario 는 그대로, 없거나 모르면 case(둘 다)다', () => {
    expect(['ui', 'fn', 'scenario', 'case', undefined, 'x'].map(목록종류읽기)).toEqual([
      'ui',
      'fn',
      'scenario',
      'case',
      'case',
      'case',
    ]);
  });

  it('조건 글자 — case 는 UI 와 FN 둘 다다', () => {
    expect(종류조건('ui')).toBe("r.kind = 'UI'");
    expect(종류조건('fn')).toBe("r.kind = 'FN'");
    expect(종류조건('scenario')).toBe("r.kind = 'SCENARIO'");
    expect(종류조건('case')).toBe("r.kind IN ('UI','FN')");
    expect(종류조건('case', '')).toBe("kind IN ('UI','FN')");
  });
});
