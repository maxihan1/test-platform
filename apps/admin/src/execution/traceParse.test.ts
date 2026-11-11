// trace 파서의 거르기 · 단계 붙이기 · 깨진 줄. 진짜 형식은 traceContract.test.ts 가 지키고 여기는 손으로 만든 zip 으로 갈래를 본다

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { trace를푼다, 단계를읽는다 } from './traceParse.js';

const j = (...줄: unknown[]): string => 줄.map((l) => JSON.stringify(l)).join('\n');

function 자원(at: number, 종류: string | undefined, url: string, status: number, 덧: Record<string, unknown> = {}) {
  return {
    type: 'resource-snapshot',
    snapshot: {
      _monotonicTime: at,
      ...(종류 === undefined ? {} : { _resourceType: 종류 }),
      time: 3.4,
      request: { method: 'GET', url },
      response: { status, content: { mimeType: 'application/json', text: '{"a":1}' }, ...덧 },
    },
  };
}

async function zip(파일: Record<string, string>): Promise<Buffer> {
  const 묶음 = new JSZip();
  for (const [이름, 글] of Object.entries(파일)) 묶음.file(이름, 글);
  return 묶음.generateAsync({ type: 'nodebuffer' });
}

// 단계 1 은 시각 200 에, 단계 2 는 시각 400 에 첨부를 단다
const 테스트 = j(
  { type: 'context-options', monotonicTime: 100 },
  { type: 'before', callId: 'hook@0', method: 'hook', class: 'Test', title: 'Before Hooks', startTime: 100 },
  { type: 'before', callId: 'fixture@1', parentId: 'hook@0', method: 'fixture', class: 'Test', startTime: 101 },
  { type: 'after', callId: 'hook@0', endTime: 140 },
  { type: 'before', callId: 'pw:api@2', parentId: 'fixture@1', method: 'pw:api', class: 'Test', title: 'Create page', startTime: 102 },
  { type: 'before', callId: 'pw:api@3', method: 'pw:api', class: 'Test', title: 'Navigate', params: { url: 'http://a/' }, startTime: 150 },
  { type: 'after', callId: 'pw:api@3', endTime: 160 },
  { type: 'before', callId: 'test.attach@4', method: 'test.attach', class: 'Test', startTime: 200 },
  { type: 'after', callId: 'test.attach@4', attachments: [{ name: 'platform-step', file: 'attachments/s1' }] },
  { type: 'before', callId: 'pw:api@5', method: 'pw:api', class: 'Test', title: 'Click getByRole(button)', params: { locator: 'getByRole(button)' }, startTime: 300 },
  { type: 'after', callId: 'pw:api@5', endTime: 350, error: { message: '\u001b[31m시간 초과\u001b[39m' } },
  { type: 'before', callId: 'pw:api@6', method: 'pw:api', class: 'Test', title: 'Screenshot', startTime: 380 },
  { type: 'before', callId: 'test.attach@7', method: 'test.attach', class: 'Test', startTime: 400 },
  { type: 'after', callId: 'test.attach@7', attachments: [{ name: 'platform-step', file: 'attachments/s2' }] },
);

const 기본 = {
  'test.trace': 테스트,
  'attachments/s1': '{"seq":1}',
  'attachments/s2': '{"seq":2}',
};

describe('trace를푼다', () => {
  it('조작은 케이스 본문 것만 · 증적 사진은 빼고 · 다음 단계 첨부로 단계 번호를 붙인다', async () => {
    const 풀림 = await trace를푼다(await zip(기본), { 본문: false });

    expect(풀림.actions).toEqual([
      { seq: 1, atMs: 50, title: 'Navigate', target: 'http://a/', value: null, secretField: false, durationMs: 10, error: null },
      { seq: 2, atMs: 200, title: 'Click getByRole(button)', target: 'getByRole(button)', value: null, secretField: false, durationMs: 50, error: '시간 초과' },
    ]);
  });

  it('잘 온 이미지 · 글꼴은 버리고 API · 이동 · 실패(4xx · 5xx · 끊김)는 남긴다 — 준비 중 · 정리 줄은 단계 밖이다', async () => {
    const 풀림 = await trace를푼다(
      await zip({
        ...기본,
        '1-trace.network': j(
          자원(120, 'fetch', 'http://a/준비', 200),
          자원(150, 'document', 'http://a/', 200),
          자원(160, 'image', 'http://a/ok.png', 200),
          자원(170, 'image', 'http://a/없음.png', 404),
          자원(180, 'script', 'http://a/x.js', 0, { _failureText: 'net::ERR_FAILED' }),
          자원(250, 'fetch', 'http://a/api', 200),
          자원(260, undefined, 'http://a/req', 201),
          자원(500, 'xhr', 'http://a/뒤', 200),
        ),
      }),
      { 본문: false },
    );

    expect(풀림.network.map((n) => [n.seq, n.url, n.status, n.failure])).toEqual([
      [null, 'http://a/준비', 200, null],
      [1, 'http://a/', 200, null],
      [1, 'http://a/없음.png', 404, null],
      [1, 'http://a/x.js', null, 'net::ERR_FAILED'],
      [2, 'http://a/api', 200, null],
      [2, 'http://a/req', 201, null],
      [null, 'http://a/뒤', 200, null],
    ]);
    expect(풀림.network.every((n) => n.requestBody === null && n.responseBody === null)).toBe(true);
  });

  it('본문을 읽으라면 API 줄의 글 본문만 읽는다 — 페이지 HTML 은 안 읽는다', async () => {
    const 풀림 = await trace를푼다(
      await zip({ ...기본, '1-trace.network': j(자원(150, 'document', 'http://a/', 200), 자원(250, 'fetch', 'http://a/api', 200)) }),
      { 본문: true },
    );

    expect(풀림.network.map((n) => n.responseBody)).toEqual([null, '{"a":1}']);
  });

  it('깨진 줄 · 쓰다 만 마지막 줄은 건너뛰고 나머지를 읽는다', async () => {
    const 풀림 = await trace를푼다(
      await zip({ ...기본, '0-trace.trace': `{"type":"console","messageType":"error","text":"가","time":150}\n{깨짐\n{"type":"console","messageType":"warning","text":"나","time":2` }),
      { 본문: false },
    );

    expect(풀림.console).toEqual([{ seq: 1, atMs: 50, level: 'error', text: '가', url: null }]);
  });

  it('test.trace 가 없는 zip 도 던지지 않고 빈 기록을 준다', async () => {
    expect(await trace를푼다(await zip({ 'x.txt': '' }), { 본문: false })).toEqual({ network: [], actions: [], console: [] });
  });
});

describe('단계를읽는다', () => {
  it('단계 첨부를 차례대로 · 실패한 판정과 오류(색 뺌)를 싣는다', async () => {
    const 단계들 = await 단계를읽는다(
      await zip({
        ...기본,
        'attachments/s1': JSON.stringify({ seq: 1, title: '연다', status: 'PASS', assertions: [{ statement: 'a', status: 'PASS', actual: 1, expected: 1 }] }),
        'attachments/s2': JSON.stringify({
          seq: 2,
          title: '누른다',
          status: 'FAIL',
          error: { message: '\u001b[31m시간 초과\u001b[39m' },
          assertions: [{ statement: '합계', status: 'FAIL', actual: 900, expected: 1000 }],
        }),
      }),
    );
    expect(단계들).toEqual([
      { seq: 1, title: '연다', status: 'PASS', error: null, failed: [] },
      { seq: 2, title: '누른다', status: 'FAIL', error: '시간 초과', failed: [{ statement: '합계', expected: 1000, actual: 900 }] },
    ]);
  });

  it('첨부가 없으면 빈 목록이다', async () => {
    expect(await 단계를읽는다(await zip({ 'x.txt': '' }))).toEqual([]);
  });
});
