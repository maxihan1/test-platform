// 호환성 자동 선택 · 화면 커버리지 · 예상 소요 시간의 순수 셈

import { describe, expect, it } from 'vitest';

import { 셈하기, 예상하기, 자동선택, type 화면 } from './select.js';

const 화면들 = (...keys: string[]): 화면[] => keys.map((key) => ({ key, name: `${key} 이름` }));

describe('자동선택', () => {
  it('안 덮은 화면을 가장 많이 더하는 케이스부터 고르고 더할 것이 없으면 멈춘다', () => {
    const 전체 = 화면들('/a', '/b', '/c', '/d');
    const 고름 = 자동선택(전체, [
      { tcId: 'X-001', name: '하나', 틀: ['/a'] },
      { tcId: 'X-002', name: '셋', 틀: ['/a', '/b', '/c'] },
      { tcId: 'X-003', name: '둘', 틀: ['/c', '/d'] },
      { tcId: 'X-004', name: '없음', 틀: ['/zz'] },
    ]);
    expect(고름).toEqual([
      { tcId: 'X-002', name: '셋', adds: 3 },
      { tcId: 'X-003', name: '둘', adds: 1 },
    ]);
  });

  it('더하는 수가 같으면 지나는 화면이 적은 케이스, 그다음 tcId 차례다', () => {
    const 전체 = 화면들('/a', '/b', '/c');
    expect(자동선택(전체, [
      { tcId: 'X-002', name: '', 틀: ['/a', '/b'] },
      { tcId: 'X-001', name: '', 틀: ['/c', '/b'] },
      { tcId: 'X-003', name: '', 틀: ['/a'] },
    ]).map((x) => x.tcId)).toEqual(['X-001', 'X-003']);
    expect(자동선택(전체, [
      { tcId: 'X-009', name: '', 틀: ['/a'] },
      { tcId: 'X-008', name: '', 틀: ['/a'] },
    ]).map((x) => x.tcId)).toEqual(['X-008']);
  });

  it('인자 없는 주소는 인자 붙은 틀도 덮고 앱 · 게임 열쇠는 그대로 맞춘다', () => {
    const 전체 = 화면들('/list?tab=:x', 'app:Main/장바구니', 'game:World/zone:Town');
    expect(자동선택(전체, [
      { tcId: 'X-001', name: '', 틀: ['/list', 'app:Main/장바구니'] },
      { tcId: 'X-002', name: '', 틀: ['app:Main/장바구니?', 'game:World/zone:Town'] },
    ])).toEqual([
      { tcId: 'X-001', name: '', adds: 2 },
      { tcId: 'X-002', name: '', adds: 1 },
    ]);
  });
});

describe('셈하기', () => {
  it('직접 추가한 케이스도 지나는 화면에 세고 남은 화면은 미커버다', () => {
    const 전체 = 화면들('/a', '/b', '/c');
    const 후보들 = [
      { tcId: 'X-001', name: '', 틀: ['/a'] },
      { tcId: 'X-002', name: '', 틀: ['/b'] },
    ];
    expect(셈하기(전체, 후보들, ['X-001'], false)).toEqual({
      auto: [
        { tcId: 'X-001', name: '', adds: 1 },
        { tcId: 'X-002', name: '', adds: 1 },
      ],
      coverage: { covered: 2, total: 3, fallback: false },
      uncovered: [{ key: '/c', name: '/c 이름' }],
    });
  });

  it('후보가 없으면 고른 것이 없고 전부 미커버다', () => {
    expect(셈하기(화면들('/a'), [], [], true)).toEqual({ auto: [], coverage: { covered: 0, total: 1, fallback: true }, uncovered: [{ key: '/a', name: '/a 이름' }] });
  });
});

describe('예상하기', () => {
  it('테스트는 상태마다 케이스 소요 합, 기록 없는 케이스는 1분, AI 점검은 화면 수 × 7초(세션당 40장까지)다', () => {
    expect(예상하기([{ 화면수: 3, 평균ms: 90_000 }, { 화면수: 0, 평균ms: null }, { 화면수: 100, 평균ms: 30_000 }], 14)).toEqual({
      runs: 42,
      testMinutes: 42,
      checkMinutes: 6,
    });
  });

  it('케이스나 상태가 없으면 0 이다', () => {
    expect(예상하기([], 3)).toEqual({ runs: 0, testMinutes: 0, checkMinutes: 0 });
    expect(예상하기([{ 화면수: 2, 평균ms: null }], 0)).toEqual({ runs: 0, testMinutes: 0, checkMinutes: 0 });
  });
});
