import { describe, expect, it } from 'vitest';

import { 가져갈결정, 겹침들, 겹침모양검사, 겹침상한, 결정인가, 남은겹침수 } from './conflicts.js';

const 한줄 = {
  tcId: 'PAY-031',
  name: '쿠폰을 적용하면 금액이 준다',
  file: 'tests/pay/PAY-031.spec.ts',
  kinds: ['TCID', 'REQUIREMENT'],
  with: [{ tcId: 'PAY-031', name: '장바구니가 빈다', file: 'tests/pay/PAY-031.spec.ts' }],
  requirements: ['REQ-PAY-004'],
};

describe('반영 결과의 겹침 모양', () => {
  it('맞는 모양은 그대로 받는다', () => {
    expect(겹침모양검사([한줄])).toEqual([한줄]);
    const 번호없음 = { tcId: 한줄.tcId, name: 한줄.name, file: 한줄.file, kinds: ['NAME'], with: 한줄.with };
    expect(겹침모양검사([번호없음])).toEqual([번호없음]);
  });

  it('배열이 아니거나 모르는 칸 · 모르는 종류 · 빈 종류 · tc_id 꼴이 아니면 거절한다', () => {
    expect(겹침모양검사({})).toBeNull();
    expect(겹침모양검사([{ ...한줄, extra: 1 }])).toBeNull();
    expect(겹침모양검사([{ ...한줄, kinds: ['SIMILAR'] }])).toBeNull();
    expect(겹침모양검사([{ ...한줄, kinds: [] }])).toBeNull();
    expect(겹침모양검사([{ ...한줄, tcId: 'pay-31' }])).toBeNull();
    expect(겹침모양검사([{ ...한줄, with: [{ tcId: 'PAY-001', name: 1, file: 'x' }] }])).toBeNull();
  });

  it('같은 tc_id 가 두 번 오면 거절한다', () => {
    expect(겹침모양검사([한줄, 한줄])).toBeNull();
  });

  it(`${String(겹침상한)}건을 넘으면 거절한다 — 화면과 끝내기 본문이 끝없이 커지지 않게`, () => {
    const 많이 = Array.from({ length: 겹침상한 + 1 }, (_, i) => ({ ...한줄, tcId: `PAY-${String(i + 1).padStart(3, '0')}` }));
    expect(겹침모양검사(많이)).toBeNull();
    expect(겹침모양검사(많이.slice(0, 겹침상한))).not.toBeNull();
  });

  it('저장된 결과에서 겹침 목록을 꺼낸다. 없으면 빈 배열', () => {
    expect(겹침들({ conflicts: [한줄] })).toEqual([한줄]);
    expect(겹침들({})).toEqual([]);
    expect(겹침들(null)).toEqual([]);
  });
});

describe('사람이 고른 것', () => {
  it('남긴다 · 뺀다 둘만 받는다', () => {
    expect(결정인가('KEEP')).toBe(true);
    expect(결정인가('DROP')).toBe(true);
    expect(결정인가('RENUMBER')).toBe(false);
    expect(결정인가(undefined)).toBe(false);
  });

  it('고르지 않은 겹침 수를 센다 — 목록 밖 결정은 세지 않는다', () => {
    const 입력 = {
      'PAY-031': { action: 'KEEP' as const, by: 'a', at: 't' },
      'PAY-099': { action: 'DROP' as const, by: 'a', at: 't' },
    };
    expect(남은겹침수([한줄, { ...한줄, tcId: 'PAY-032' }], 입력)).toBe(1);
    expect(남은겹침수([한줄], null)).toBe(1);
    expect(남은겹침수([], null)).toBe(0);
  });

  it('반영을 가져갈 때는 고른 것을 전부 싣는다 — 거르기는 에이전트가 새 목록으로 한다', () => {
    const 입력 = {
      'PAY-031': { action: 'KEEP' as const, by: 'a', at: 't' },
      'PAY-099': { action: 'DROP' as const, by: 'a', at: 't' },
    };
    expect(가져갈결정(입력)).toEqual([
      { tcId: 'PAY-031', action: 'KEEP' },
      { tcId: 'PAY-099', action: 'DROP' },
    ]);
    expect(가져갈결정(null)).toEqual([]);
  });
});
