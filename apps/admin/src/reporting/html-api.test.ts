// API 항목의 요청 · 응답 원문 · 응답 형식 검사가 증적에 어떻게 실리는지 본다 (도메인/API §3.8 「리포트 — 원문을 접어 넣는다」)
import { describe, expect, it } from 'vitest';

import { 원문글 } from './apiTrace.js';
import type { EvidenceDocument, EvidenceItem, EvidenceStep } from './collect.js';
import { renderHtml } from './html.js';

const HTML = { generatedAt: '2026-10-21 10:00', format: 'HTML' } as const;
const PDF = { generatedAt: '2026-10-21 10:00', format: 'PDF' } as const;

const 원문 = 원문글({
  request: { method: 'POST', url: 'https://stg.example.com/v1/pushes', headers: { Authorization: 'Bearer ********' }, data: { title: '<주문 완료>' } },
  response: { status: 201, body: '{"id":"p-1","status":"QUEUED"}' },
});

const 보내기: EvidenceStep = {
  seq: 1,
  title: '푸시를 보낸다',
  status: 'PASS',
  durationMs: 40,
  screenshotPath: null,
  assertions: [{ statement: '응답 코드가 201 이다', expected: '201', actual: '201', status: 'PASS', blocker: false }],
  httpTrace: 원문,
  shapeChecks: [
    { method: 'POST', path: '/v1/pushes', status: 201, result: 'PASS' },
    { method: 'POST', path: '/v1/pushes', status: 400, result: 'NO_SHAPE' },
    { method: 'GET', path: '/v1/pushes/{id}', status: 200, result: 'FAIL', problems: ['status 칸이 없습니다'] },
  ],
};

function 항목(tcId: string, 덮을것: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    tcId,
    tcName: `${tcId} 케이스`,
    platform: 'desktop',
    attempt: 1,
    status: 'PASS',
    durationMs: 100,
    notRunReason: null,
    unconfirmed: null,
    precondition: [],
    params: [],
    expected: [],
    steps: [보내기],
    ...덮을것,
  };
}

function 문서(items: EvidenceItem[]): EvidenceDocument {
  return {
    runId: 21,
    header: {
      serviceName: '알림 서버',
      testsRepo: 'https://git.example.com/notify-tests',
      title: '야간 회귀',
      kind: '기능 테스트',
      startedAt: '2026-10-21T00:00:00Z',
      triggeredByName: '김검수',
      env: 'stg',
      baseUrl: 'https://stg.example.com',
    },
    items,
  };
}

describe('API 항목 원문', () => {
  it('원문 글은 메서드 · 주소 · 머리 · 본문과 응답 코드 · 본문이고, 없는 칸은 줄을 안 만든다', () => {
    expect(원문).toEqual({
      request: 'POST https://stg.example.com/v1/pushes\n머리 {\n  "Authorization": "Bearer ********"\n}\n본문 {\n  "title": "<주문 완료>"\n}',
      response: '201\n{"id":"p-1","status":"QUEUED"}',
    });
    expect(원문글({ request: { method: 'GET', url: '/v1/health' }, response: { status: 204, body: '' } })).toEqual({
      request: 'GET /v1/health',
      response: '204',
    });
  });

  it('kit 이 2000자에서 자른 본문은 잘렸다고 적는다', () => {
    expect(원문글({ request: {}, response: { status: 200, body: 'a'.repeat(2000) } }).response.endsWith('\n… 2000자에서 잘림')).toBe(true);
    expect(원문글({ request: {}, response: { status: 200, body: 'a'.repeat(1999) } }).response).not.toContain('잘림');
  });

  it('잘림은 항목 비밀값을 가리기 전 길이로 보고, 가린 글에는 비밀값이 안 남는다', () => {
    const 글 = 원문글({ request: {}, response: { status: 200, body: `${'a'.repeat(1990)}pin-123456` } }, ['pin-123456']);
    expect(글.response).toBe(`200\n${'a'.repeat(1990)}********\n… 2000자에서 잘림`);
  });

  it('읽을 것이 없는 원문은 빈 글이고, 글이 아닌 응답 본문은 JSON 으로 편다', () => {
    expect(원문글({ request: {}, response: {} })).toEqual({ request: '', response: '' });
    expect(원문글({ request: null, response: { status: 200, body: { id: 1 } } }).response).toBe('200\n{\n  "id": 1\n}');
  });

  it('HTML 은 절차 안에 원문을 접어 두고 확인 문장 아래 응답 형식 검사를 따로 보인다', () => {
    const html = renderHtml(문서([항목('NTF-001', { status: 'FAIL' })]), HTML);
    expect(html).toContain('<details class="trace-fold"><summary class="trace-line">요청 · 응답 원문</summary>');
    expect(html).toContain('&quot;title&quot;: &quot;&lt;주문 완료&gt;&quot;');
    expect(html.indexOf('응답 코드가 201 이다')).toBeLessThan(html.indexOf('<div class="shape-label">응답 형식 검사</div>'));
    expect(html).toContain('POST /v1/pushes 201</span>문서와 같습니다');
    expect(html).toContain('POST /v1/pushes 400</span>문서에 응답 형식 없음');
    expect(html).toContain('GET /v1/pushes/{id} 200</span>문서와 다릅니다');
    expect(html).toContain('· status 칸이 없습니다');
    expect(html).not.toContain('부록 — 요청 · 응답 원문');
  });

  it('PDF 는 그 자리에 부록 고리를 걸고 부록에 원문을 한 번씩 싣는다 — 접힌 통과 줄의 원문도 빠지지 않는다', () => {
    const html = renderHtml(문서([항목('NTF-001', { status: 'FAIL' }), 항목('NTF-002')]), PDF);
    expect(html).not.toContain('<details class="trace-fold">');
    expect(html).toContain('<a class="trace-line" href="#t-0-1">');
    expect(html).toContain('<a class="trace-line" href="#t-1-1">');
    expect(html.match(/<section class="app-trace" id="t-\d+-1">/g)).toEqual([
      '<section class="app-trace" id="t-0-1">',
      '<section class="app-trace" id="t-1-1">',
    ]);
    expect(html.indexOf('부록 — 접힌 줄의 상세')).toBeLessThan(html.indexOf('부록 — 요청 · 응답 원문'));
  });

  it('원문이 없는 항목(화면 케이스)은 원문 줄도 부록 절도 없다', () => {
    const 화면 = { ...보내기, httpTrace: undefined, shapeChecks: undefined };
    const html = renderHtml(문서([항목('WEB-001', { status: 'FAIL', steps: [화면] })]), PDF);
    expect(html).not.toContain('class="trace-line"');
    expect(html).not.toContain('<div class="shape-label">');
    expect(html).not.toContain('부록 — 요청 · 응답 원문');
  });
});
