// 작성 중 실패 요약 — 깨짐 · 값 다름 · 5xx · 4xx · 끊김 · 한도 의심 · zip 없음 · 비밀번호 가림

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { 네트워크줄, 단계줄, 조작줄, 풀린trace } from '../apps/admin/src/execution/traceParse.js';
import { 가르기, 계정비밀번호, 요약글, zip찾기 } from './authoring-trace.js';

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

  it('그 단계에 5xx 가 있으면 깨짐 · 값 다름보다 서버 오류가 먼저다', () => {
    const r = 가르기(
      풀림({
        actions: [조작(1, 'Click', { error: 'Timeout 5000ms exceeded' })],
        network: [요청(1, 'POST', 'http://a/api/orders?x=1', 503), 요청(2, 'GET', 'http://a/api/late', 500)],
      }),
      [단계(1, { status: 'FAIL', error: 'Timeout' })],
    );
    expect(r).toMatchObject({ 가름: '서버 오류(5xx)', 까닭: 'POST /api/orders?x=1 503' });
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
    expect(요약글(r)).toEqual(
      expect.arrayContaining(['API: GET /api/me 200', '4xx(근거로만 — 입력 오류 케이스는 정상): POST /api/login 401']),
    );
  });

  it('값을 넣은 뒤 기다리다 시간 초과면 한도 막음을 의심하는 줄을 단다 — 비밀번호 칸은 길이를 안 잰다', () => {
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

describe('zip찾기', () => {
  it('폴더 아래 trace.zip 을 다 모으고, 없는 경로는 빈 목록이다', () => {
    const 뿌리 = mkdtempSync(join(tmpdir(), 'trace-find-'));
    mkdirSync(join(뿌리, 'a'));
    writeFileSync(join(뿌리, 'a', 'trace.zip'), '');
    writeFileSync(join(뿌리, 'a', 'other.txt'), '');
    expect(zip찾기([뿌리])).toEqual([join(뿌리, 'a', 'trace.zip')]);
    expect(zip찾기([join(뿌리, '없음')])).toEqual([]);
  });
});

describe('계정비밀번호', () => {
  it('PLATFORM_ACCOUNTS 의 비밀번호만 · 깨진 값은 빈 목록', () => {
    expect(계정비밀번호({ PLATFORM_ACCOUNTS: '[{"role":"일반 회원","loginId":"u","loginPassword":"pw1234"},{"role":"관리자","loginPassword":""}]' })).toEqual(['pw1234']);
    expect(계정비밀번호({ PLATFORM_ACCOUNTS: '{' })).toEqual([]);
    expect(계정비밀번호({})).toEqual([]);
  });
});
