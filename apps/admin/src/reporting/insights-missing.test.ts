// 직전 대비 「빠진 건수」를 케이스 수로 세는지 본다 (같은 케이스의 PC · 모바일 줄은 하나 — 순수 함수라 DB 없이 돈다)

import { describe, expect, it } from 'vitest';

import { 케이스판정들, type 접힌행 } from './insights.js';

const 행 = (tc_id: string, platform: string): 접힌행 => ({ tc_id, tc_name: `${tc_id} 이름`, platform, status: 'PASS' });

describe('케이스판정들 빠진건수', () => {
  it('케이스 4건 × PC · 모바일이 통째로 빠지면 8이 아니라 4다', () => {
    const 앞 = ['A-1', 'A-2', 'A-3', 'A-4'].flatMap((id) => [행(id, 'desktop'), 행(id, 'mobile')]);
    const 이번 = [행('A-9', 'desktop'), 행('A-9', 'mobile')];

    expect(케이스판정들(앞, 이번).빠진건수).toBe(4);
  });

  it('이번에 디바이스 하나로만 돈 케이스는 빠진 것이 아니다 — 이번에 한 줄도 없는 케이스만 센다', () => {
    const 앞 = [행('A-1', 'desktop'), 행('A-1', 'mobile'), 행('A-2', 'desktop'), 행('A-2', 'mobile')];
    const 이번 = [행('A-1', 'desktop')];

    expect(케이스판정들(앞, 이번).빠진건수).toBe(1);
  });
});
