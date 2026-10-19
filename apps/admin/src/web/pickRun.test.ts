import { describe, expect, it } from 'vitest';

import type { CaseRow, Platform } from './api.js';
import { 넘었나 } from './runPlan.js';
import { 담을것, 몇건, 실행항목, 안드로이드있나, 지난값글자 } from './pickRun.js';
import { schemaToFields } from './schema.js';

function 케이스(tcId: string, platforms: Platform[], isActive = true): CaseRow {
  return {
    tcId,
    name: tcId,
    platforms,
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

const PC만 = 케이스('ZZP-0001', ['desktop']);
const 둘다 = 케이스('ZZP-0002', ['desktop', 'mobile']);
const 비활성 = 케이스('ZZP-0003', ['desktop'], false);

const 아무것도안고름 = new Map<string, CaseRow>();
const 고름 = (...것들: CaseRow[]) => new Map(것들.map((c) => [c.tcId, c]));

describe('담을것', () => {
  it('고른 것이 없으면 넘겨받은 목록 전부를 담는다', () => {
    expect(담을것([PC만, 둘다], 아무것도안고름).map((c) => c.tcId)).toEqual(['ZZP-0001', 'ZZP-0002']);
  });

  it('고른 것이 있으면 그것만 담는다', () => {
    expect(담을것([PC만, 둘다], 고름(둘다)).map((c) => c.tcId)).toEqual(['ZZP-0002']);
  });

  it('고른 것은 목록에 없어도 담는다', () => {
    expect(담을것([], 고름(PC만, 둘다)).map((c) => c.tcId)).toEqual(['ZZP-0001', 'ZZP-0002']);
  });

  it('비활성 케이스는 고른 것에 섞여 있어도 안 담는다', () => {
    expect(담을것([PC만, 비활성], 고름(PC만, 비활성)).map((c) => c.tcId)).toEqual(['ZZP-0001']);
    expect(담을것([PC만, 비활성], 아무것도안고름).map((c) => c.tcId)).toEqual(['ZZP-0001']);
  });
});

describe('실행항목', () => {
  it('케이스마다 자기가 선언한 디바이스를 그대로 쓴다', () => {
    expect(실행항목([PC만, 둘다], {}).map((i) => i.platforms)).toEqual([['desktop'], ['desktop', 'mobile']]);
  });

  it('값을 안 고친 케이스는 params 와 expected 가 빈 객체다', () => {
    expect(실행항목([PC만], {})).toEqual([
      { tcId: 'ZZP-0001', platforms: ['desktop'], params: {}, expected: {} },
    ]);
  });

  it('고친 값은 그 케이스에만 실린다', () => {
    const 항목들 = 실행항목([PC만, 둘다], { 'ZZP-0002': { params: { q: '검색어' }, expected: { count: 3 } } });
    expect(항목들[0]).toEqual({ tcId: 'ZZP-0001', platforms: ['desktop'], params: {}, expected: {} });
    expect(항목들[1]).toEqual({
      tcId: 'ZZP-0002',
      platforms: ['desktop', 'mobile'],
      params: { q: '검색어' },
      expected: { count: 3 },
    });
  });
});

describe('몇건', () => {
  it('디바이스 수의 합이다 — 곱이 아니다', () => {
    expect(몇건([PC만, 둘다], 1)).toBe(3);
  });

  it('반복 횟수를 곱한다', () => {
    expect(몇건([PC만, 둘다], 4)).toBe(12);
  });

  it('상한을 넘으면 넘었다고 판정한다', () => {
    const 많이 = Array.from({ length: 2501 }, (_, i) => 케이스(`ZZP-9${String(i).padStart(3, '0')}`, ['desktop', 'mobile']));
    expect(넘었나(몇건(많이, 1))).toBe(true);
    expect(넘었나(몇건([PC만, 둘다], 1))).toBe(false);
  });
});

describe('안드로이드있나', () => {
  it('하나라도 android 가 선언돼 있으면 true 다', () => {
    expect(안드로이드있나([PC만, 케이스('ZZP-A01', ['android'])])).toBe(true);
  });

  it('브라우저만이면 false 다', () => {
    expect(안드로이드있나([PC만, 둘다])).toBe(false);
  });
});

describe('지난값글자', () => {
  const 칸들 = schemaToFields(
    {
      type: 'object',
      properties: {
        userId: { type: 'string', description: '아이디' },
        password: { type: 'string', description: '비밀번호' },
        count: { type: 'integer', description: '개수' },
        tags: { type: 'object', description: '꼬리표' },
        memo: { type: 'string', description: '메모' },
      },
    },
    undefined,
    undefined,
  );

  it('비밀값 칸은 응답이 가린 별표를 그대로 채우지 않도록 뺀다', () => {
    expect(칸들.find((f) => f.key === 'password')?.secret).toBe(true);
    expect(지난값글자(칸들, { userId: 'u9', password: '********' })).toEqual({ userId: 'u9' });
  });

  it('글자가 아닌 값은 글자로 바꾸고 객체는 JSON 으로 편다', () => {
    expect(지난값글자(칸들, { count: 3, tags: { a: 1 } })).toEqual({ count: '3', tags: '{"a":1}' });
  });

  it('값이 없거나 null 이면 그 칸을 뺀다 — 코드 기본값으로 남는다', () => {
    expect(지난값글자(칸들, { memo: null })).toEqual({});
  });

  it('스키마에 없는 키는 무시한다', () => {
    expect(지난값글자(칸들, { 낯선키: 'x' })).toEqual({});
  });
});
