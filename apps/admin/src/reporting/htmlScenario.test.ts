// E2E 증적이 단계 층 · 모킹 · 건너뜀 · 값 연결 · 정리를 결과 화면과 같은 글자로 그리는지 본다. 순수 함수라 DB 를 쓰지 않는다

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import type { ScenarioRunPart, ScenarioRunResult } from '../web/scenarioApi.js';
import { E2E모양 } from './collectScenario.js';
import { renderHtml } from './html.js';
import { renderScenarioHtml } from './htmlScenario.js';
import { renderScenarioXlsx } from './xlsx.js';

function 부품(seq: number, 덮: Partial<ScenarioRunPart>): ScenarioRunPart {
  return {
    seq,
    kind: 'case',
    tcId: `XDE-00${seq}`,
    tcName: `케이스 ${seq}`,
    part: { kind: 'case', tcId: `XDE-00${seq}`, params: {}, expected: {}, skipSteps: [] },
    status: 'PASS',
    durationMs: 500,
    skippedSteps: [],
    mocks: [],
    paramSchema: null,
    expectedSchema: null,
    precondition: [],
    unconfirmed: null,
    bound: {},
    cleanup: [],
    steps: [],
    error: null,
    trace: null,
    ...덮,
  };
}

const 로그인 = 부품(1, {
  tcName: '로그인 확인',
  part: { kind: 'case', tcId: 'XDE-001', params: { id: 'kim', password: 'hunter2' }, expected: {}, skipSteps: [], carryOver: false },
  paramSchema: { type: 'object', properties: { id: { description: '아이디' }, password: { description: '비밀번호' } } },
  precondition: ['가입된 계정이 있다'],
  steps: [{ seq: 1, title: '로그인', status: 'PASS', durationMs: 100, assertions: [] }],
});
const 모킹 = 부품(2, {
  kind: 'mock',
  tcId: null,
  tcName: null,
  part: { kind: 'mock', urlPattern: '**/api/pg/**', status: 200, contentType: 'application/json', body: '{}' },
  mocks: ['**/api/pg/**'],
});
const 결제 = 부품(3, {
  tcName: '결제 <확인>',
  part: {
    kind: 'case',
    tcId: 'XDE-003',
    params: {},
    expected: {},
    skipSteps: ['로그인'],
    links: [{ kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/orders', jsonPath: 'id' } }],
  },
  status: 'FAIL',
  mocks: ['**/api/pg/**'],
  skippedSteps: ['로그인'],
  bound: { orderId: 812 },
  unconfirmed: '화면에서 읽은 값입니다',
  cleanup: [{ method: 'DELETE', url: '/api/orders/812', status: 204 }],
  steps: [
    { seq: 4, title: '로그인', status: 'PASS', durationMs: 0, assertions: [], skipped: true },
    {
      seq: 5,
      title: '결제 버튼 누르기',
      status: 'FAIL',
      durationMs: 10,
      assertions: [{ statement: '결제가 끝난다', status: 'FAIL', expected: '완료', actual: '실패' }],
      httpTrace: { request: { body: 'RAW-REQUEST' }, response: { body: 'RAW-RESPONSE' } },
      error: { message: 'at Object.<anonymous> (pay.spec.ts:12)' },
    },
  ],
  error: { message: '기대와 다릅니다' },
});
const 안돈 = 부품(4, { status: 'NA', durationMs: null, error: { message: 'NOT_RUN' }, steps: [] });

const 결과: Omit<ScenarioRunResult, 'evidence'> = {
  scenarioId: 12,
  version: 3,
  status: 'FINISHED',
  platform: 'desktop',
  title: '결제 흐름 <script>',
  env: 'qa',
  baseUrl: 'https://qa.example.com',
  triggeredBy: 'kim',
  triggeredByName: '김검사',
  startedAt: '2026-10-16T05:20:00.000Z',
  finishedAt: '2026-10-16T05:21:00.000Z',
  parts: [로그인, 모킹, 결제, 안돈],
};

const 모양 = E2E모양(77, 결과, { serviceName: '커머스', testsRepo: 'https://git.example.com/t' });
const html = renderScenarioHtml(모양, { generatedAt: '2026-10-16 15:00' });

describe('E2E 증적 HTML', () => {
  it('머리와 시나리오 줄 — 종류 · 버전 · 디바이스 · 판정 · 미확정', () => {
    expect(html).toContain('<dd>E2E 시나리오</dd>');
    expect(html).toContain('SC-12');
    expect(html).toContain('v3');
    expect(html).toContain('PC');
    expect(html).toContain('<span class="verdict v-fail">실패</span>');
    expect(html).toContain('미확정 · 화면에서 읽은 값입니다');
  });

  it('모킹 단계는 실제 서버 응답이 아니라고 적고, 그 뒤 단계에 모킹 구간을 칠한다', () => {
    expect(html).toContain('**/api/pg/** → 200 (실제 서버 응답이 아님)');
    expect(html).toContain('<section class="stage mocked">');
    expect(html).toContain('모킹이 적용된 상태로 실행했습니다 — **/api/pg/**');
    expect(html).toContain('적용됨');
  });

  it('건너뛴 준비 · 값 연결 · 단독 실행을 결과 화면 글자로 적는다', () => {
    expect(html).toContain('사전 단계 「로그인」 — 1번에서 이미 실행');
    expect(html).toContain('값 주입');
    expect(html).toContain('orderId ← 1번 POST **/orders 응답의 id = 812');
    expect(html).toContain('단독 실행');
    expect(html).toMatch(/<span class="step-title">로그인<\/span><span class="badge">건너뜀<\/span>/);
  });

  it('안 돈 단계는 한 줄이고 절차를 그리지 않는다', () => {
    const 넷째 = html.slice(html.indexOf('4단계'));
    expect(넷째).toContain('– 실행 안 됨');
    expect(넷째.slice(0, 넷째.indexOf('</section>'))).not.toContain('사전조건');
  });

  it('끝에 보낸 정리는 마지막 단계 뒤에 미룬 단계 번호와 함께', () => {
    expect(html).toContain('테스트 데이터 정리 · 마지막에 실행 DELETE /api/orders/812 → 204 (3번이 미룸)');
    expect(html.indexOf('테스트 데이터 정리 · 마지막에 실행')).toBeGreaterThan(html.indexOf('4단계'));
  });

  it('요청 · 응답 원문과 코드는 넣지 않는다', () => {
    for (const 금지 of ['httpTrace', 'RAW-REQUEST', 'RAW-RESPONSE', 'pay.spec.ts', '<pre', '<code']) expect(html).not.toContain(금지);
  });

  it('사람이 적은 글은 HTML 로 해석되지 않는다', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain('결제 흐름 &lt;script&gt;');
    expect(html).toContain('결제 &lt;확인&gt;');
  });

  it('서버 가리기를 빠져나온 비밀 칸도 문서에서는 가린다', () => {
    expect(html).not.toContain('hunter2');
    expect(html).toContain('********');
  });

  it('웹만의 시나리오는 머리에 기기 줄이 없다', () => {
    expect(html).not.toContain('<dt>기기</dt>');
  });

  it('앱 · 게임 단계가 있는 시나리오는 머리에 폰 한 벌을 기기 줄로 적는다', () => {
    const 앱결과 = { ...결과, platform: 'android' as const, device: { model: 'SM-S921N', osVersion: '14', appVersion: null } };
    const 앱html = renderScenarioHtml(E2E모양(78, 앱결과, { serviceName: '커머스', testsRepo: 'https://git.example.com/t' }), { generatedAt: '2026-10-29 15:00' });
    expect(앱html).toContain('<dt>기기</dt><dd>SM-S921N · Android 14 · 앱 판 모름</dd>');
  });
});

describe('E2E 증적 모델', () => {
  it('사진 경로는 실행 번호와 절차 순번으로 다시 세운다 — 숫자 비밀이 번호와 겹쳐 가려져도 사진이 빠지지 않는다', () => {
    const 가린 = { ...결과, parts: [부품(1, { steps: [{ seq: 5, title: '찍기', status: 'FAIL', durationMs: 1, assertions: [], screenshotPath: 'artifacts/runs/4********/scenario/5.png' }] })] };
    expect(E2E모양(41234, 가린, { serviceName: '', testsRepo: '' }).parts[0]?.item?.steps[0]?.screenshotPath).toBe('artifacts/runs/41234/scenario/5.png');
  });

  it('케이스 단계가 실패하면 그 사유를 적는다 — 결과 화면이 보이는 문장이다', () => {
    const 실패 = { ...결과, parts: [부품(1, { status: 'FAIL', error: { message: '제한 시간 30초를 넘겼다' } })] };
    expect(E2E모양(1, 실패, { serviceName: '', testsRepo: '' }).parts[0]?.사유).toBe('제한 시간 30초를 넘겼다');
  });

  it('러너 · 서버 상태 코드는 결과 화면과 같은 사람 말로 적는다', () => {
    const 멈춤 = { ...결과, parts: [부품(1, { status: 'NA', error: { message: 'TIMEOUT' } }), 부품(2, { status: 'NA', error: { message: 'ABORTED' } })] };
    const [첫, 둘] = E2E모양(1, 멈춤, { serviceName: '', testsRepo: '' }).parts;
    expect(첫?.사유).toBe('제한 시간 초과');
    expect(첫?.item?.notRunReason).toBe('제한 시간 초과');
    expect(둘?.사유).toBe('서버 재시작으로 멈춤');
  });
});

describe('E2E 증적 엑셀', () => {
  it('단계 칸이 앞에 붙고 건너뛴 절차 · 안 돈 단계 · 정리가 행으로 남는다', async () => {
    const 책 = new ExcelJS.Workbook();
    await 책.xlsx.load(new Uint8Array(await renderScenarioXlsx(모양, { generatedAt: '2026-10-16T06:00:00.000Z' })).buffer);
    const 행들 = (책.getWorksheet('E2E 증적')?.getSheetValues() ?? []).filter(Array.isArray) as unknown[][];
    const 머리 = 행들[0]!;
    expect(머리[1]).toBe('단계');
    const 칸 = (이름: string) => 머리.indexOf(이름);
    const 본문 = 행들.slice(1);

    expect(본문.some((r) => String(r[1]).startsWith('2단계 · 모킹 켜기') && r[칸('케이스명')] === '**/api/pg/** → 200 (실제 서버 응답이 아님)')).toBe(true);
    expect(본문.some((r) => String(r[1]).includes('값 주입 · orderId'))).toBe(true);
    expect(본문.some((r) => r[칸('절차명')] === '로그인' && r[칸('절차판정')] === '건너뜀')).toBe(true);
    expect(본문.some((r) => String(r[1]).startsWith('4단계') && r[칸('판정')] === '실행 안 됨')).toBe(true);
    expect(String(본문.at(-1)?.[1])).toBe('테스트 데이터 정리 · 마지막에 실행 DELETE /api/orders/812 → 204 (3번이 미룸)');
    expect(본문.at(-1)?.[칸('종류')]).toBe('E2E 시나리오');
  });
});

describe('케이스 증적의 E2E 요약', () => {
  const 문서 = {
    runId: 7,
    header: { serviceName: '커머스', testsRepo: 'r', title: '야간', kind: '기능 테스트', startedAt: 's', triggeredByName: 'k', env: 'qa', baseUrl: 'u' },
    items: [],
  };

  it('시나리오마다 한 줄 — 시각 · 판정 · 멈춘 단계 · 미확정, 안 돌린 것은 실행 기록 없음', () => {
    const 글 = renderHtml(문서, {
      generatedAt: 'g',
      format: 'HTML',
      e2e: [
        { scenarioId: 12, name: '결제 흐름', startedAt: '2026-10-16T05:20:00.000Z', verdict: 'FAIL', stoppedAt: 3, unconfirmed: true },
        { scenarioId: 13, name: '가입', startedAt: '2026-10-15T01:00:00.000Z', verdict: 'PASS', stoppedAt: null, unconfirmed: false },
        { scenarioId: 14, name: '탈퇴', startedAt: null, verdict: null, stoppedAt: null, unconfirmed: false },
        { scenarioId: 15, name: '단계 없이 멈춤', startedAt: '2026-10-14T01:00:00.000Z', verdict: 'NA', stoppedAt: null, unconfirmed: false },
      ],
    });
    expect(글).not.toMatch(/SC-15.*모두 통과/);
    expect(글).toContain('E2E 요약');
    expect(글).toContain('이 요약은 문서를 만든 때 기준이다');
    expect(글).toContain('2026-10-16T05:20:00.000Z · 3번에서 멈춤');
    expect(글).toContain('2026-10-15T01:00:00.000Z · 모두 통과');
    expect(글).toMatch(/SC-14.*실행 기록 없음/);
    expect(글).toContain('케이스 판정은 위 카드와 줄이 정본이다');
  });

  it('시나리오가 없으면 절을 그리지 않는다', () => {
    expect(renderHtml(문서, { generatedAt: 'g', format: 'PDF', e2e: [] })).not.toContain('E2E 요약');
  });
});
