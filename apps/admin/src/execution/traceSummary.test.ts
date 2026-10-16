// 실패 요약 — 깨짐 · 값 다름 · 5xx · 4xx · 끊김 · 한도 의심 · 가린 뒤 자르기

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import type { 네트워크줄, 단계줄, 조작줄, 풀린trace } from './traceParse.js';
import { 가르기, 요약글, 요약줄들 } from './traceSummary.js';

const 조작 = (seq: number, title: string, 덧: Partial<조작줄> = {}): 조작줄 => ({
  seq,
  atMs: 0,
  title,
  target: null,
  value: null,
  secretField: false,
  durationMs: 1,
  error: null,
  ...덧,
});
const 요청 = (seq: number, method: string, url: string, status: number | null, 덧: Partial<네트워크줄> = {}): 네트워크줄 => ({
  seq,
  atMs: 0,
  method,
  url,
  status,
  resourceType: 'fetch',
  durationMs: 5,
  failure: null,
  requestBody: null,
  responseBody: null,
  ...덧,
});
const 단계 = (seq: number, 덧: Partial<단계줄> = {}): 단계줄 => ({ seq, title: `단계${seq}`, status: 'PASS', error: null, failed: [], ...덧 });
const 풀림 = (덧: Partial<풀린trace> = {}): 풀린trace => ({ network: [], actions: [], console: [], ...덧 });

describe('가르기', () => {
  it('요소를 못 찾아 시간 초과면 깨짐 — 실패한 조작과 그 앞 조작을 짚는다', () => {
    const r = 가르기(
      풀림({
        actions: [
          조작(1, 'Navigate'),
          조작(2, 'Click getByRole(link)'),
          조작(2, 'Click getByRole(button)', { error: 'locator.click: Timeout 5000ms exceeded.\nwaiting for getByRole(button)' }),
        ],
      }),
      [단계(1), 단계(2, { status: 'FAIL', error: 'locator.click: Timeout 5000ms exceeded.' })],
    );
    expect(r).toMatchObject({ 가름: '깨짐', 까닭: '기다리다 시간 초과', 한도의심: null });
    expect(r.실패조작?.title).toBe('Click getByRole(button)');
    expect(r.앞조작.map((a) => a.title)).toEqual(['Click getByRole(link)']);
  });

  it('같은 이름 요소가 여럿이면 깨짐(strict)', () => {
    const r = 가르기(풀림({ actions: [조작(1, 'Click', { error: 'strict mode violation: getByText(저장) resolved to 2 elements' })] }), [
      단계(1, { status: 'FAIL', error: 'strict mode violation' }),
    ]);
    expect(r).toMatchObject({ 가름: '깨짐', 까닭: '같은 이름 요소가 여럿' });
  });

  it('조작은 다 됐는데 판정이 틀리면 값 다름 — 문장 · 기대 · 실제를 싣는다', () => {
    const r = 가르기(풀림(), [단계(1, { status: 'FAIL', failed: [{ statement: '합계가 보인다', expected: '1,000원', actual: '900원' }] })]);
    expect(r).toMatchObject({ 가름: '값 다름', 까닭: '「합계가 보인다」 기대 "1,000원" · 실제 "900원"' });
  });

  it('판정만 틀린 단계는 케이스가 잡아 삼킨 조작 오류가 있어도 값 다름이다', () => {
    const r = 가르기(풀림({ actions: [조작(1, 'Wait for selector', { error: 'Timeout 5000ms exceeded.' }), 조작(1, 'Inner text')] }), [
      단계(1, { status: 'FAIL', failed: [{ statement: '합계', expected: 1000, actual: 900 }] }),
    ]);
    expect(r).toMatchObject({ 가름: '값 다름', 실패조작: null, 한도의심: null });
  });

  it('실패한 때까지 난 5xx 가 있으면 깨짐 · 값 다름보다 서버 오류가 먼저다', () => {
    const r = 가르기(
      풀림({
        actions: [조작(1, 'Click', { atMs: 100, durationMs: 50, error: 'Timeout 5000ms exceeded' })],
        network: [요청(1, 'POST', 'http://a/api/orders?x=1', 503, { atMs: 120 })],
      }),
      [단계(1, { status: 'FAIL', error: 'Timeout' })],
    );
    expect(r).toMatchObject({ 가름: '서버 오류(5xx)', 까닭: 'POST /api/orders?x=1 503' });
  });

  it('실패 뒤에 난 5xx · 다시 불러 성공한 5xx 는 탓하지 않는다', () => {
    const 실패 = 조작(1, 'Click', { atMs: 100, durationMs: 50, error: 'Timeout 5000ms exceeded' });
    const r = 가르기(
      풀림({
        actions: [실패],
        network: [요청(1, 'GET', 'http://a/api/me', 500, { atMs: 10 }), 요청(1, 'GET', 'http://a/api/me', 200, { atMs: 20 }), 요청(1, 'POST', 'http://a/collect', 503, { atMs: 200 })],
      }),
      [단계(1, { status: 'FAIL', error: 'Timeout' })],
    );
    expect(r.가름).toBe('깨짐');
  });

  it('응답 없이 끊긴 요청이면 끊김', () => {
    const r = 가르기(풀림({ network: [요청(1, 'GET', 'http://a/api/me', null, { failure: 'net::ERR_CONNECTION_RESET' })] }), [
      단계(1, { status: 'FAIL', failed: [{ statement: '이름이 보인다', expected: 'a', actual: '' }] }),
    ]);
    expect(r).toMatchObject({ 가름: '끊김', 까닭: 'GET /api/me 응답 없음 — net::ERR_CONNECTION_RESET' });
  });

  it('4xx 는 가르지 않고 근거 줄로만 싣는다 — 입력 오류 케이스는 4xx 가 정상이다', () => {
    const r = 가르기(풀림({ network: [요청(1, 'POST', 'http://a/api/login', 401), 요청(1, 'GET', 'http://a/api/me', 200)] }), [
      단계(1, { status: 'FAIL', failed: [{ statement: '오류 문구가 보인다', expected: '틀렸습니다', actual: '' }] }),
    ]);
    expect(r.가름).toBe('값 다름');
    expect(요약글(r)).toEqual(expect.arrayContaining(['API: GET /api/me 200', '4xx(근거로만 — 입력 오류 케이스는 정상): POST /api/login 401']));
  });

  it('값을 넣은 뒤 기다리다 시간 초과면 한도 막음을 의심하는 줄을 단다 — 가린 값은 길이를 안 잰다', () => {
    const 넣고기다림 = (value: string) =>
      가르기(
        풀림({
          actions: [
            조작(1, `Fill "${value}"`, { target: "getByLabel('연락처')", value }),
            조작(1, 'Wait for selector', { error: 'locator.waitFor: Timeout 5000ms exceeded.' }),
          ],
        }),
        [단계(1, { status: 'FAIL', error: 'Timeout' })],
      );
    expect(넣고기다림('010123456789').한도의심).toEqual({ target: "getByLabel('연락처')", 길이: 12 });
    expect(요약글(넣고기다림('010123456789')).at(-1)).toContain("getByLabel('연락처') 에 12자");
    expect(넣고기다림('********').한도의심).toBeNull();
  });

  it('다른 단계의 요청 · 콘솔은 섞지 않는다', () => {
    const r = 가르기(
      풀림({
        network: [요청(1, 'GET', 'http://a/api/x', 500), 요청(2, 'GET', 'http://a/api/y', 200)],
        console: [{ seq: 1, atMs: 0, level: 'error', text: '앞 단계 오류', url: null }],
      }),
      [단계(1), 단계(2, { status: 'FAIL', failed: [{ statement: 's', expected: 1, actual: 2 }] })],
    );
    expect(r.가름).toBe('값 다름');
    expect(r.api.map((n) => n.url)).toEqual(['http://a/api/y']);
    expect(r.콘솔).toEqual([]);
  });

  it('실패한 단계가 없으면 모름 — 단계 밖에서 멈췄다', () => {
    expect(가르기(풀림(), [단계(1)]).가름).toBe('모름');
  });
});

describe('요약줄들', () => {
  it('가린 뒤에 자른다 — 줄 끝에 걸친 비밀값도 조각이 남지 않는다', async () => {
    const 묶음 = new JSZip();
    const 실제 = `${'x'.repeat(470)}pw-secret-1234`;
    묶음.file(
      'test.trace',
      [
        { type: 'context-options', monotonicTime: 0 },
        { type: 'before', callId: 'test.attach@1', method: 'test.attach', class: 'Test', startTime: 10 },
        { type: 'after', callId: 'test.attach@1', attachments: [{ name: 'platform-step', file: 'attachments/s1' }] },
      ]
        .map((l) => JSON.stringify(l))
        .join('\n'),
    );
    묶음.file('attachments/s1', JSON.stringify({ seq: 1, title: '본다', status: 'FAIL', assertions: [{ statement: 's', status: 'FAIL', expected: 'a', actual: 실제 }] }));
    const 줄 = await 요약줄들(await 묶음.generateAsync({ type: 'nodebuffer' }), ['pw-secret-1234']);
    expect(줄[0]).toMatch(/^가름: 값 다름/);
    expect(줄.join('\n')).not.toMatch(/pw-s/);
    expect(줄[0]!.length).toBeLessThanOrEqual(500);
  });
});
