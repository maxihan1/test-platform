// 케이스 고치기 요청 본문 검사 — 한 줄씩 거절 사유와 정규화된 결과 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」)

import { describe, expect, it } from 'vitest';

import { 고치기상한, 고칠것검사, type 케이스정보 } from './edit.js';

const 칸들 = {
  title: { type: 'string', description: '제목', minLength: 1, maxLength: 10 },
  count: { type: 'integer', minimum: 0, maximum: 5 },
  price: { type: 'number' },
  ok: { type: 'boolean' },
  grade: { type: 'string', enum: ['A', 'B'] },
  level: { enum: ['상', '하'] },
  mixed: { enum: ['A', 1] },
  items: { type: 'array', items: { type: 'string' } },
  meta: { type: 'object', properties: {} },
  maybe: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  plain: { description: '타입 없음' },
  hidden: { type: 'string', secret: true },
  userPw: { type: 'string' },
  apiToken: { type: 'string' },
};

function 케이스(tcId: string, 덧: Partial<케이스정보> = {}): [string, 케이스정보] {
  return [tcId, { tcId, active: true, unconfirmed: null, expectedSchema: { type: 'object', properties: 칸들 }, ...덧 }];
}

const 판 = {
  케이스들: new Map<string, 케이스정보>([
    케이스('SHOP-001'),
    케이스('SHOP-002', { unconfirmed: '화면에서 본 값' }),
    케이스('SHOP-003', { active: false }),
    케이스('SHOP-004', { expectedSchema: null }),
    케이스('SHOP-005', { unconfirmed: '확인 필요 — SHOP-REQ-003' }),
    케이스('OTHER-001'),
  ]),
  접두사: 'SHOP',
  비밀번호들: ['pa55!'],
};

const 나쁨 = (detail: string) => ({ error: 'BAD_EDIT', detail });

describe('고칠것검사 — 맞는 요청', () => {
  it('지우기 · 기대값 · 확정을 입력 순서대로 돌려준다', () => {
    const 본문 = {
      edits: [
        { tcId: 'SHOP-002', confirm: true, expected: { ok: true } },
        { tcId: 'SHOP-001', delete: true },
      ],
    };
    expect(고칠것검사(본문, 판)).toEqual({
      edits: [
        { tcId: 'SHOP-002', expected: { ok: true }, confirm: true },
        { tcId: 'SHOP-001', delete: true },
      ],
    });
  });

  it('기대값만 · 확정만 있는 줄은 없는 키를 만들어 넣지 않는다', () => {
    const 결과 = 고칠것검사(
      { edits: [{ tcId: 'SHOP-001', expected: { title: '주문 완료', count: 0, price: -2, grade: 'A', level: '상' } }, { tcId: 'SHOP-002', confirm: true }] },
      판,
    );
    expect(결과).toEqual({
      edits: [
        { tcId: 'SHOP-001', expected: { title: '주문 완료', count: 0, price: -2, grade: 'A', level: '상' } },
        { tcId: 'SHOP-002', confirm: true },
      ],
    });
    if ('edits' in 결과) {
      expect(Object.keys(결과.edits[0] ?? {})).toEqual(['tcId', 'expected']);
      expect(Object.keys(결과.edits[1] ?? {})).toEqual(['tcId', 'confirm']);
    }
  });

  it('상한 개수까지는 받는다', () => {
    const 많이 = new Map<string, 케이스정보>();
    for (let i = 1; i <= 고치기상한; i += 1) {
      const [id, 정보] = 케이스(`SHOP-${String(i).padStart(3, '0')}`);
      많이.set(id, 정보);
    }
    const edits = [...많이.keys()].map((tcId) => ({ tcId, delete: true }));
    expect(고칠것검사({ edits }, { ...판, 케이스들: 많이 })).toEqual({ edits });
  });
});

describe('고칠것검사 — 본문 모양', () => {
  const 상한넘김 = Array.from({ length: 고치기상한 + 1 }, (_, i) => ({ tcId: `SHOP-${i}`, delete: true }));
  it.each([
    ['객체가 아닌 본문', 'edits'],
    ['null 본문', null],
    ['배열 본문', [{ tcId: 'SHOP-001', delete: true }]],
    ['edits 없음', {}],
    ['edits 가 배열이 아님', { edits: { tcId: 'SHOP-001', delete: true } }],
    ['빈 edits', { edits: [] }],
    ['상한을 넘는 edits', { edits: 상한넘김 }],
  ])('%s 는 BAD_EDIT · 빈 detail', (_이름, 본문) => {
    expect(고칠것검사(본문, 판)).toEqual(나쁨(''));
  });
});

describe('고칠것검사 — 줄마다 거절', () => {
  it.each([
    ['객체가 아닌 줄', ['SHOP-001'], ''],
    ['tcId 가 글자가 아님', [{ tcId: 1, delete: true }], ''],
    ['tcId 없음', [{ delete: true }], ''],
    ['없는 케이스', [{ tcId: 'SHOP-999', delete: true }], 'SHOP-999'],
    ['꺼진 케이스', [{ tcId: 'SHOP-003', delete: true }], 'SHOP-003'],
    ['다른 서비스 접두사', [{ tcId: 'OTHER-001', delete: true }], 'OTHER-001'],
    ['같은 tcId 두 번', [{ tcId: 'SHOP-001', delete: true }, { tcId: 'SHOP-001', confirm: true }], 'SHOP-001'],
    ['delete 가 true 가 아님', [{ tcId: 'SHOP-001', delete: false }], 'SHOP-001'],
    ['delete 에 expected 를 같이', [{ tcId: 'SHOP-001', delete: true, expected: { ok: true } }], 'SHOP-001'],
    ['delete 에 confirm 을 같이', [{ tcId: 'SHOP-002', delete: true, confirm: true }], 'SHOP-002'],
    ['모르는 키', [{ tcId: 'SHOP-001', expected: { ok: true }, note: '왜' }], 'SHOP-001'],
    ['고칠 것이 없음', [{ tcId: 'SHOP-001' }], 'SHOP-001'],
    ['빈 expected', [{ tcId: 'SHOP-001', expected: {} }], 'SHOP-001'],
    ['expected 가 배열', [{ tcId: 'SHOP-001', expected: [true] }], 'SHOP-001'],
    ['expected 가 null', [{ tcId: 'SHOP-001', expected: null }], 'SHOP-001'],
    ['confirm 이 true 가 아님', [{ tcId: 'SHOP-002', confirm: false }], 'SHOP-002'],
    ['미확정이 아닌 케이스를 확정', [{ tcId: 'SHOP-001', confirm: true }], 'SHOP-001'],
    ['표준 기획서가 정한 미확정을 확정', [{ tcId: 'SHOP-005', confirm: true }], 'SHOP-005'],
  ])('%s', (_이름, edits, detail) => {
    expect(고칠것검사({ edits }, 판)).toEqual(나쁨(detail));
  });

  it('앞 줄이 맞아도 뒤 줄이 틀리면 전체를 거절한다', () => {
    expect(고칠것검사({ edits: [{ tcId: 'SHOP-001', delete: true }, { tcId: 'SHOP-999', delete: true }] }, 판)).toEqual(
      나쁨('SHOP-999'),
    );
  });
});

describe('고칠것검사 — 기대값 칸', () => {
  it.each([
    ['명세에 없는 칸', 'nope', '값'],
    ['상속 키 이름', 'constructor', '값'],
    ['배열 칸', 'items', 'a'],
    ['객체 칸', 'meta', 'a'],
    ['anyOf 칸', 'maybe', 'a'],
    ['타입 없는 칸', 'plain', 'a'],
    ['글자 아닌 것이 섞인 enum 칸', 'mixed', 'A'],
    ['secret 표시 칸', 'hidden', 'a'],
    ['이름이 비밀값인 칸 (pw)', 'userPw', 'a'],
    ['이름이 비밀값인 칸 (token)', 'apiToken', 'a'],
    ['글자 칸에 숫자', 'title', 3],
    ['글자 칸에 빈 글자 (minLength)', 'title', ''],
    ['글자 칸에 너무 긴 글자 (maxLength)', 'title', '열한글자짜리제목입니다'],
    ['정수 칸에 소수', 'count', 1.5],
    ['정수 칸에 범위 밖 (minimum)', 'count', -1],
    ['정수 칸에 범위 밖 (maximum)', 'count', 6],
    ['숫자 칸에 NaN', 'price', Number.NaN],
    ['숫자 칸에 Infinity', 'price', Number.POSITIVE_INFINITY],
    ['숫자 칸에 글자', 'price', '1'],
    ['참거짓 칸에 글자', 'ok', 'true'],
    ['enum 밖 값', 'grade', 'C'],
    ['타입 없는 enum 밖 값', 'level', '중'],
    ['값이 객체', 'title', { a: 1 }],
    ['값이 null', 'title', null],
    ['테스트 계정 비밀번호와 같은 값', 'title', 'pa55!'],
  ])('%s 는 tcId.칸 으로 거절한다', (_이름, 칸, 값) => {
    expect(고칠것검사({ edits: [{ tcId: 'SHOP-001', expected: { [칸]: 값 } }] }, 판)).toEqual(나쁨(`SHOP-001.${칸}`));
  });

  it('expectedSchema 가 비어 있으면 어떤 칸도 받지 않는다', () => {
    expect(고칠것검사({ edits: [{ tcId: 'SHOP-004', expected: { title: 'a' } }] }, 판)).toEqual(나쁨('SHOP-004.title'));
  });
});
