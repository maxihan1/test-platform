// trace 를 DB 에 넣기 전 가리기와 zip 자리. DB 를 쓰는 갈래는 traceIngest-db.test.ts 가 본다

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDir } from '../../../../packages/kit/src/runtime/artifacts.js';
import type { 풀린trace } from './traceParse.js';
import { trace가린다, trace경로, 글가린다 } from './traceIngest.js';

const 별 = '********';

describe('trace경로', () => {
  it('kit 리포터가 옮기는 자리(runDir)와 같다', () => {
    expect(trace경로(5, 77)).toBe(`${runDir('5', '77')}/trace.zip`);
  });
});

describe('글가린다', () => {
  it('실행 값 목록에 든 비밀값을 어디서든 가린다', () => {
    expect(글가린다('주문 실패 pa55word', ['pa55word'])).toBe(`주문 실패 ${별}`);
  });

  it('주소 물음표 뒤 · 폼 본문의 비밀 칸 이름 값을 가린다 — 다른 칸은 그대로', () => {
    expect(글가린다('http://a/api/login?token=t0k&name=kim', [])).toBe(`http://a/api/login?token=${별}&name=kim`);
    expect(글가린다('userPassword=abc&page=2', [])).toBe(`userPassword=${별}&page=2`);
  });

  it('네트워크에만 나오는 이름(api_key · 인증 머리 · 세션)과 대괄호 이름 · Bearer 꼴도 가린다', () => {
    expect(글가린다('http://a/?api_key=XYZ&q=1', [])).toBe(`http://a/?api_key=${별}&q=1`);
    expect(글가린다('user[password]=x&page=2', [])).toBe(`user[password]=${별}&page=2`);
    expect(글가린다('{"authorization":"Bearer abc","sessionId":"s1"}', [])).toBe(`{"authorization":"${별}","sessionId":"${별}"}`);
    expect(글가린다('보냄 Bearer eyJ.abc-1= 끝', [])).toBe(`보냄 Bearer ${별} 끝`);
  });

  it('JSON 본문의 비밀 칸 이름 값을 가린다 — 글 · 숫자 둘 다', () => {
    expect(글가린다('{"accessToken":"s3cret","ok":true,"pw": 1234}', [])).toBe(`{"accessToken":"${별}","ok":true,"pw": "${별}"}`);
  });
});

describe('trace가린다', () => {
  const 풀림: 풀린trace = {
    network: [
      {
        seq: 2, atMs: 10, method: 'POST', url: 'http://a/login?token=t0k', status: 500, resourceType: 'fetch', durationMs: 3,
        failure: null, requestBody: `{"password":"pa55word","memo":"${'가'.repeat(3000)}"}`, responseBody: '{"error":"pa55word 틀림"}',
      },
    ],
    actions: [
      { seq: 2, atMs: 5, title: 'Fill "pa55word"', target: "getByLabel('비밀번호')", value: 'pa55word', secretField: true, durationMs: 1, error: null },
      { seq: 2, atMs: 6, title: 'Fill "몰래값"', target: "getByLabel('메모')", value: '몰래값', secretField: false, durationMs: 1, error: null },
      { seq: 2, atMs: 7, title: 'Fill "안녕"', target: "getByLabel('이름')", value: '안녕', secretField: false, durationMs: 1, error: null },
      { seq: 2, atMs: 8, title: 'Type "1"', target: "getByLabel('PIN 1')", value: '1', secretField: true, durationMs: 1, error: null },
    ],
    console: [{ seq: 2, atMs: 8, level: 'error', text: '로그인 실패 token=abc', url: null }],
  };

  const 가림 = trace가린다(풀림, ['몰래값']);

  it('네트워크 — 주소 토큰 · 본문의 비밀 칸을 가리고, 가린 뒤 2000자로 자른다', () => {
    const [n] = 가림.network;
    expect(n!.url).toBe(`http://a/login?token=${별}`);
    expect(n!.requestBody!.startsWith(`{"password":"${별}","memo":"가`)).toBe(true);
    expect(n!.requestBody).toHaveLength(2000);
    expect(n!.responseBody).toBe('{"error":"pa55word 틀림"}');
  });

  it('조작 — 비밀번호 칸 값은 무엇이든 가리고, 값 목록의 값도 가리고, 이름의 따옴표 안 값만 같이 바꾼다', () => {
    expect(가림.actions.map((a) => [a.title, a.value, a.target])).toEqual([
      [`Fill "${별}"`, 별, "getByLabel('비밀번호')"],
      [`Fill "${별}"`, 별, "getByLabel('메모')"],
      ['Fill "안녕"', '안녕', "getByLabel('이름')"],
      [`Type "${별}"`, 별, "getByLabel('PIN 1')"],
    ]);
  });

  it('콘솔 글도 같은 규칙이다', () => {
    expect(가림.console[0]!.text).toBe(`로그인 실패 token=${별}`);
  });

  it('주소 경로(물음표 앞)는 경로 목록으로만 가린다 — 계정 아이디 admin 이 /api/admin/banners 를 가리지 않고, 물음표 뒤와 본문은 다 가린다', () => {
    const 아이디 = trace가린다(
      {
        network: [{ ...풀림.network[0]!, url: 'http://a/api/admin/banners?loginId=admin&pw=pa55word', requestBody: '{"id":"admin"}', responseBody: null }],
        actions: [],
        console: [{ seq: 2, atMs: 8, level: 'error', text: 'admin 실패', url: 'http://a/api/admin/x?u=admin' }],
      },
      ['pa55word', 'admin'],
      ['pa55word'],
    );
    expect(아이디.network[0]!.url).toBe(`http://a/api/admin/banners?loginId=${별}&pw=${별}`);
    expect(아이디.network[0]!.requestBody).toBe(`{"id":"${별}"}`);
    expect(아이디.console[0]).toMatchObject({ text: `${별} 실패`, url: `http://a/api/admin/x?u=${별}` });
    expect(trace가린다({ ...풀림, network: [{ ...풀림.network[0]!, url: 'http://a/u/pa55word/admin#admin' }] }, ['pa55word', 'admin'], ['pa55word']).network[0]!.url).toBe(
      `http://a/u/${별}/admin#${별}`,
    );
  });

  it('경로 목록을 안 주면 경로도 값 목록 전부로 가린다', () => {
    expect(trace가린다({ ...풀림, network: [{ ...풀림.network[0]!, url: 'http://a/api/admin/banners' }] }, ['admin']).network[0]!.url).toBe(`http://a/api/${별}/banners`);
  });

  // 2000자 자르기가 이모지를 가르고, 바이너리 본문에는 NUL 이 든다. 남으면 저장(json_to_recordset · jsonb)이 깨진다 (FIX-F2-02)
  it('NUL 과 자르다 생긴 이모지 반쪽은 U+FFFD 로 바꾼다', () => {
    const 깨짐 = trace가린다(
      {
        network: [{ ...풀림.network[0]!, url: 'http://a/x', requestBody: null, responseBody: `${'a'.repeat(1999)}😀` }],
        actions: [],
        console: [{ seq: 2, atMs: 8, level: 'error', text: 'PK\u0000', url: null }],
      },
      [],
    );
    expect(깨짐.network[0]!.responseBody).toBe(`${'a'.repeat(1999)}�`);
    expect(깨짐.console[0]!.text).toBe('PK�');
  });
});

describe('trace적재를맡긴다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../db/index.js');
  });

  it('적재가 깨져도 던지지 않고 사유만 남긴다 — 결과 저장 · 다음 항목은 그대로다', async () => {
    vi.resetModules();
    vi.doMock('../db/index.js', () => ({ pool: { query: async () => Promise.reject(new Error('DB 꺼짐')) } }));
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { trace적재를맡긴다: 맡긴다 } = await import('./traceIngest.js');

    await expect(맡긴다(1)).resolves.toBeUndefined();
    await expect(맡긴다(2)).resolves.toBeUndefined();
    expect(오류.mock.calls.map((c) => String(c[0]))).toEqual([
      '[execution] 항목 1 의 trace 를 적재하지 못했다: DB 꺼짐',
      '[execution] 항목 2 의 trace 를 적재하지 못했다: DB 꺼짐',
    ]);
  });
});
