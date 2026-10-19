import { describe, expect, it } from 'vitest';

import { 오류없음, 채운글자 } from './caseValues.js';
import { schemaToFields } from './schema.js';

const 칸들 = schemaToFields(
  {
    type: 'object',
    properties: {
      currency: { type: 'string', description: '통화', default: 'KRW' },
      amount: { type: 'number', description: '금액', default: 100 },
    },
  } as never,
  undefined,
  undefined,
);

describe('채운글자 — 고친 값이 있으면 그것, 없으면 코드 기본값', () => {
  it('고친 값이 없으면(undefined) 코드 기본값 글자다', () => {
    expect(채운글자(칸들, undefined)).toEqual({ currency: 'KRW', amount: '100' });
  });

  it('고친 칸만 덮고 나머지는 기본값으로 둔다', () => {
    expect(채운글자(칸들, { currency: 'USD' })).toEqual({ currency: 'USD', amount: '100' });
  });

  it('오류없음은 빈 표다 — 상세 칸은 서버 사유를 안 붙인다', () => {
    expect(오류없음).toEqual({});
  });
});
