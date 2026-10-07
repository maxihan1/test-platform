import type { ScenarioLink } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import type { ScenarioRunPart, ScenarioRunRow } from './scenarioApi.js';
import { E2E띠색, 값연결글, 건너뜀번호, 멈춘단계글자, 미확정있나, 접은판정 } from './scenarioResultView.js';

describe('접은판정', () => {
  it('도는 중이면 부품이 NA 여도 null', () => {
    expect(접은판정([{ status: 'NA' }, { status: 'NA' }], 'RUNNING')).toBeNull();
  });
  it('전부 PASS → PASS · FAIL 하나 → FAIL · 그 밖 NA · 빈 부품 NA', () => {
    expect(접은판정([{ status: 'PASS' }, { status: 'PASS' }], 'FINISHED')).toBe('PASS');
    expect(접은판정([{ status: 'PASS' }, { status: 'FAIL' }, { status: 'NA' }], 'FINISHED')).toBe('FAIL');
    expect(접은판정([{ status: 'PASS' }, { status: 'NA' }], 'FINISHED')).toBe('NA');
    expect(접은판정([], 'FINISHED')).toBe('NA');
  });
});

describe('미확정있나', () => {
  it('하나라도 사유가 있으면 참', () => {
    expect(미확정있나([{ unconfirmed: null }, { unconfirmed: '사유' }])).toBe(true);
    expect(미확정있나([{ unconfirmed: null }])).toBe(false);
    expect(미확정있나([])).toBe(false);
  });
});

describe('건너뜀번호', () => {
  const 부품 = (seq: number, steps: { title: string; skipped?: boolean }[]): ScenarioRunPart =>
    ({
      seq,
      kind: 'case',
      steps: steps.map((s) => ({ seq: 1, title: s.title, status: 'PASS', durationMs: 0, ...(s.skipped ? { skipped: true } : {}) })),
    }) as unknown as ScenarioRunPart;

  it('앞 case 단계 중 그 제목을 건너뛰지 않고 돈 첫 단계의 번호', () => {
    const 모음 = [부품(1, [{ title: '로그인', skipped: true }]), 부품(2, [{ title: '로그인' }]), 부품(3, [{ title: '로그인' }])];
    expect(건너뜀번호(모음, 3, '로그인')).toBe(2);
    expect(건너뜀번호(모음, 2, '로그인')).toBeNull();
    expect(건너뜀번호(모음, 3, '없는 제목')).toBeNull();
  });
});

describe('값연결글', () => {
  const ref = { fromSeq: 1, method: 'POST' as const, urlPattern: '**/a', jsonPath: 'data.id' };
  it('bind — 값이 있으면 뒤에 붙는다', () => {
    const l: ScenarioLink = { kind: 'bind', param: 'pid', value: ref };
    expect(값연결글(l, {}, 'ko')).toEqual({ 종류: '값 주입', 글: 'pid ← 1번 POST **/a 응답의 data.id' });
    expect(값연결글(l, { pid: 7 }, 'ko').글).toBe('pid ← 1번 POST **/a 응답의 data.id = 7');
    expect(값연결글(l, {}, 'en')).toEqual({ 종류: 'Inject value', 글: 'pid ← data.id of step 1 POST **/a response' });
  });
  it('block · reuse · rewrite', () => {
    expect(값연결글({ kind: 'block', method: 'GET', urlPattern: '**/b' }, {}, 'ko')).toEqual({ 종류: '요청 차단', 글: 'GET **/b' });
    expect(값연결글({ kind: 'reuse', method: 'GET', urlPattern: '**/b', fromSeq: 2 }, {}, 'ko')).toEqual({ 종류: '이전 응답 재사용', 글: 'GET **/b ← 2번' });
    expect(
      값연결글({ kind: 'rewrite', method: 'POST', urlPattern: '**/b', to: { method: 'PUT', path: '/b/{}', value: ref } }, {}, 'ko'),
    ).toEqual({ 종류: '수정 요청으로 변경', 글: 'POST **/b → PUT /b/{}' });
  });
});

describe('멈춘단계글자 · E2E띠색', () => {
  const 줄 = (extra: Partial<ScenarioRunRow>): ScenarioRunRow =>
    ({ status: 'FINISHED', stoppedAt: null, unconfirmed: false, verdict: 'PASS', ...extra }) as ScenarioRunRow;

  it('멈춘단계글자', () => {
    expect(멈춘단계글자(줄({ status: 'RUNNING' }), 'ko')).toBe('');
    expect(멈춘단계글자(줄({}), 'ko')).toBe('모두 통과');
    expect(멈춘단계글자(줄({ stoppedAt: 3 }), 'ko')).toBe('3번에서 멈춤');
    expect(멈춘단계글자(줄({ stoppedAt: 3 }), 'en')).toBe('Stopped at step 3');
  });

  it('E2E띠색 다섯', () => {
    expect(E2E띠색(줄({ status: 'RUNNING', verdict: null }))).toBe('var(--line-2)');
    expect(E2E띠색(줄({}))).toBe('var(--pass)');
    expect(E2E띠색(줄({ unconfirmed: true }))).toBe('var(--line-2)');
    expect(E2E띠색(줄({ verdict: 'FAIL' }))).toBe('var(--fail)');
    expect(E2E띠색(줄({ verdict: 'NA' }))).toBe('var(--na)');
    expect(E2E띠색(줄({ verdict: null }))).toBe('var(--line-2)');
  });
});
