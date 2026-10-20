import { describe, expect, it } from 'vitest';

import { 한줄로자른다 } from './insights.js';
import { 유형문장, 항목실패를가른다, type 항목재료 } from './itemFailure.js';

const 그대로 = (글: string): string => 글;

const 재료 = (덮: Partial<항목재료>): 항목재료 => ({ status: 'FAIL', finished: true, error: null, steps: [], ...덮 });

const 확인 = (statement: string, status: 'PASS' | 'FAIL') => ({ statement, status, actual: 1, expected: 2 });

describe('항목실패를가른다', () => {
  it('통과 · 아직 안 끝난 항목 · 멈춰 닫힌 미실행은 이유가 없다', () => {
    expect(항목실패를가른다(재료({ status: 'PASS' }), 그대로)).toBeNull();
    expect(항목실패를가른다(재료({ status: 'NA', finished: false }), 그대로)).toBeNull();
    expect(항목실패를가른다(재료({ status: 'NA', error: { message: 'ABORTED' } }), 그대로)).toBeNull();
  });

  it('앞 부품이 실패해 안 돈 시나리오 부품은 이유가 없다', () => {
    expect(항목실패를가른다(재료({ status: 'NA', error: { message: 'NOT_RUN' } }), 그대로)).toBeNull();
  });

  it('응답 모양만 틀린 실패는 기대 결과 불일치이고 한 줄은 첫 모양 문제다 (도메인/API §3.8)', () => {
    const 모양 = { method: 'POST', path: '/v1/pushes', status: 201, result: 'FAIL' as const, problems: ['필수 필드 없음 — status'] };
    expect(항목실패를가른다(재료({ steps: [{ assertions: [확인('응답 코드가 201 이다', 'PASS')], shapeChecks: [모양] }] }), 그대로)).toEqual({
      type: 'mismatch',
      reason: '응답 형식이 API 문서와 다릅니다 — POST /v1/pushes 201 · 필수 필드 없음 — status',
    });
    // 실패한 확인 문장이 있으면 그것이 먼저다
    expect(
      항목실패를가른다(재료({ steps: [{ assertions: [확인('상태가 SENT 다', 'FAIL')], shapeChecks: [모양] }] }), 그대로)?.reason,
    ).toBe('상태가 SENT 다');
  });

  it('확인 문장이 실패했으면 기대 결과 불일치이고 한 줄은 실패한 첫 확인 문장이다 — 값은 안 붙인다', () => {
    const 결과 = 항목실패를가른다(
      재료({
        error: { message: 'Error: expect(received).toBe(expected)' },
        steps: [
          { assertions: [확인('로그인 화면이 열린다', 'PASS')] },
          { assertions: [확인('주문 수가 1 늘어난다', 'FAIL'), 확인('합계가 맞다', 'FAIL')] },
        ],
      }),
      그대로,
    );
    expect(결과).toEqual({ type: 'mismatch', reason: '주문 수가 1 늘어난다' });
  });

  it('확인 문장 없이 깨졌으면 항목 오류의 색 코드를 지우고 빈 줄을 건너뛴 첫 줄이다', () => {
    const 결과 = 항목실패를가른다(
      재료({
        status: 'NA',
        error: { message: "\u001b[2m\n\u001b[31mTest timeout of 30000ms exceeded.\u001b[39m\n  waiting for getByRole('button')" },
      }),
      그대로,
    );
    expect(결과).toEqual({ type: 'notFound', reason: 'Test timeout of 30000ms exceeded.' });
  });

  it('항목 오류가 없으면 절차 오류로 넘어가지 않고 유형마다 정한 문장이다', () => {
    const 결과 = 항목실패를가른다(
      재료({ status: 'NA', error: null, steps: [{ assertions: [], error: { message: 'TimeoutError: Timeout 5000ms exceeded.' } }] }),
      그대로,
    );
    expect(결과).toEqual({ type: 'timeout', reason: 유형문장.timeout });
  });

  it('러너가 끊은 상태 글자(TIMEOUT)는 유형마다 정한 문장이 된다', () => {
    expect(항목실패를가른다(재료({ status: 'NA', error: { message: 'TIMEOUT' } }), 그대로)).toEqual({
      type: 'timeout',
      reason: 유형문장.timeout,
    });
  });

  it('색 코드는 가리기 전에 걷어 숫자 비밀이 색 코드를 덮지 않는다', () => {
    const 결과 = 항목실패를가른다(재료({ status: 'NA', error: { message: '\u001b[31m주문 31번이 없다\u001b[39m' } }), (글) =>
      글.replaceAll('31', '**'),
    );
    expect(결과?.reason).toBe('주문 **번이 없다');
  });

  it('한 줄은 자르기 전에 가린다', () => {
    const 결과 = 항목실패를가른다(재료({ error: { message: 'pa55word 로 로그인하지 못했다' } }), (글) =>
      글.replaceAll('pa55word', '********'),
    );
    expect(결과?.reason).toBe('******** 로 로그인하지 못했다');
  });
});

describe('한줄로자른다', () => {
  it('색 코드와 빈 첫 줄을 걷고 첫 글 줄을 고른다', () => {
    expect(한줄로자른다('\u001b[2m\n  \n Error: boom\n    at x.ts:1')).toBe('Error: boom');
  });
});
