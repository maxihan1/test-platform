// 증적 칸 글자와 예외 실패 사유가 읽을 수 있는 글로 남는지 본다 — DB 없이 도는 순수 함수 검사 (도메인/리포팅 §8.4)

import { describe, expect, it } from 'vitest';

import { toFields, 돈항목사유 } from './collect.js';

describe('증적 값 글자', () => {
  it('객체 · 배열 값은 [object Object] · 쉼표 이음이 아니라 JSON 한 줄로 적는다', () => {
    expect(toFields({ card: { no: '4111', cvc: 123 }, tags: ['a', 'b'] }, {})).toEqual([
      { label: 'card', value: '{"no":"4111","cvc":123}' },
      { label: 'tags', value: '["a","b"]' },
    ]);
  });

  it('객체 안쪽의 비밀값 이름 칸도 가린다 — 전에는 [object Object] 가 우연히 감췄다', () => {
    expect(toFields({ login: { id: 'u', password: 'hunter2' } }, {})).toEqual([
      { label: 'login', value: '{"id":"u","password":"********"}' },
    ]);
  });

  it('글자 · 숫자 · 참거짓은 전과 같다 — 글자에 따옴표를 붙이지 않는다', () => {
    expect(toFields({ id: 'tester', n: 3, ok: true }, {}).map((f) => f.value)).toEqual(['tester', '3', 'true']);
  });
});

describe('확인 문장 없이 예외로 깨진 실패의 사유', () => {
  const 실패 = { status: 'FAIL' as const, error: { message: '\u001b[31mTypeError: x is undefined\u001b[39m\n    at a.spec.ts:3' } };

  it('오류 원문의 첫 줄만 싣고 색 코드는 지운다', () => {
    expect(돈항목사유(실패, [], [])).toBe('TypeError: x is undefined');
  });

  it('항목 오류가 없으면 절차 오류에서 가져온다', () => {
    const 절차 = [{ assertions: [], error: { message: 'locator.click: Timeout 5000ms exceeded.\nCall log:' } }];
    expect(돈항목사유({ status: 'FAIL', error: null }, 절차, [])).toBe('locator.click: Timeout 5000ms exceeded.');
  });

  it('색 코드만 있는 빈 첫 줄은 건너뛰고 글이 있는 줄을 싣는다', () => {
    const 사유 = 돈항목사유({ status: 'FAIL', error: { message: '\u001b[2m\u001b[22m\nTypeError: y' } }, [], []);
    expect(사유).toBe('TypeError: y');
  });

  it('긴 첫 줄은 잘라 끝에 … 을 붙인다', () => {
    const 사유 = 돈항목사유({ status: 'FAIL', error: { message: '가'.repeat(500) } }, [], []);
    expect(사유).toBe(`${'가'.repeat(120)}…`);
  });

  it('되비친 비밀 글자는 자르기 전에 가린다', () => {
    const 사유 = 돈항목사유({ status: 'FAIL', error: { message: 'hunter2 로 로그인하지 못했다' } }, [], ['hunter2']);
    expect(사유).toBe('******** 로 로그인하지 못했다');
  });

  it('실패한 확인 문장이 있으면 그 문장이 사유라 따로 싣지 않는다', () => {
    const 절차 = [{ assertions: [{ statement: '토큰이 발급된다', status: 'FAIL' as const, actual: false, expected: true }], error: null }];
    expect(돈항목사유(실패, 절차, [])).toBeNull();
  });

  it('오류 원문이 없으면 지어내지 않는다', () => {
    expect(돈항목사유({ status: 'FAIL', error: null }, [{ assertions: [], error: null }], [])).toBeNull();
  });

  it('판정 못 낸 NA 의 사유는 전처럼 오류 원문 그대로다', () => {
    expect(돈항목사유({ status: 'NA', error: { message: '러너에 닿지 못했습니다' } }, [], [])).toBe('러너에 닿지 못했습니다');
  });
});
