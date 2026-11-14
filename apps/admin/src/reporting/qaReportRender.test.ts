// QA 리포트 HTML · 워드 — 첫 장 뒤 기능 · UI · E2E 구획 · 「비기능 검증」 호환성 격자 · 성능 목표 · 안정화 오류 종류 · 승인 전 표시 · 글 가리기. 순수 함수라 DB 를 쓰지 않는다
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import type { EvidenceItem } from './collect.js';
import type { E2E증적 } from './collectScenario.js';
import type { 문서재료, 리포트응답 } from './qaReportDoc.js';
import type { 비기능재료 } from './qaReportNonFunc.js';
import { renderQaReportDocx } from './qaReportDocx.js';
import { renderQaReportHtml } from './qaReportHtml.js';
import type { 첫장 } from './qaReportSummary.js';

function 항목(tcId: string, status: EvidenceItem['status'], 덮: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    tcId, tcName: `${tcId} 이름`, platform: 'desktop', device: null, farm: null, attempt: 1, status, durationMs: 100,
    notRunReason: status === 'FAIL' ? '기대 결과와 다릅니다' : null, unconfirmed: null, precondition: [], params: [], expected: [], steps: [], ...덮,
  };
}

const 시나리오: E2E증적 = {
  runId: 9,
  header: { serviceName: 'XQ 웹', testsRepo: '', title: '구매 흐름', kind: 'E2E', startedAt: '', triggeredByName: '', env: 'qa', baseUrl: '' },
  scenarioId: 3, version: 1, platform: 'desktop', verdict: 'FAIL', unconfirmed: false, 정리: [],
  parts: [
    { seq: 1, 종류: '케이스', 요약: '', status: 'PASS', 안돌았다: false, 적용됨: false, durationMs: 10, 모킹구간: [], 모킹안탐: false, 단독실행: false, item: 항목('XQ-FN-001', 'PASS'), 건너뜀: [], 값연결: [], 사유: null },
    { seq: 2, 종류: '케이스', 요약: '', status: 'FAIL', 안돌았다: false, 적용됨: false, durationMs: 10, 모킹구간: [], 모킹안탐: false, 단독실행: false, item: 항목('XQ-FN-002', 'FAIL'), 건너뜀: [], 값연결: [], 사유: 'boom' },
    { seq: 3, 종류: '케이스', 요약: '', status: 'NA', 안돌았다: true, 적용됨: false, durationMs: null, 모킹구간: [], 모킹안탐: false, 단독실행: false, item: 항목('XQ-FN-003', 'NA'), 건너뜀: [], 값연결: [], 사유: null },
  ],
};

const 비기능: 비기능재료 = {
  호환성: [
    {
      setName: '주요 폰',
      runId: 12,
      devices: [
        { seq: 1, model: 'SM-S918N', name: '갤럭시 S23', os: '14', fold: null },
        { seq: 2, model: 'SM-F946N', name: '폴드5', os: '14', fold: 'OPEN' },
      ],
      rows: [
        { name: '장바구니', cells: [{ seq: 1, value: 'PENDING' }, { seq: 2, value: 'OK' }] },
        { name: '결제 <완료>', cells: [{ seq: 1, value: 'CONFIRMED' }, { seq: 2, value: 'UNCHECKED', reason: 'AI 사용 한도 초과로 점검 중단' }] },
      ],
      hiddenOk: 3,
      cards: [{ screen: '장바구니', seq: 1, tcId: 'XQ-UI-001', issues: [{ kind: 'text-overflow', note: '가격이 잘림' }], verdict: null }],
    },
  ],
  성능: [
    {
      id: 7, kind: 'LOAD', title: '장바구니 부하', testType: 'LOAD', status: 'DONE', verdict: 'FAIL', stopReason: null, startedAt: '2026-11-12T02:00:00.000Z', peakVus: null,
      ai: { title: '결제 API 가 느립니다', items: ['DB 잠금 대기'] },
      targets: [
        { metric: 'P95', op: '<=', value: 800, measured: 1200, verdict: 'FAIL', source: 'PRD', reqId: 'XQ-REQ-009' },
        { metric: 'ERROR_RATE', op: '<=', value: 1, measured: 0.2, verdict: 'PASS', source: 'AI' },
      ],
      devices: new Map(),
      rows: [{ sec: 0, tx: '', vus: 5, requests: 10, errors: 0, hist: [] }],
      txs: [{ tx: 'POST /cart', requests: 1200, errors: 12, hist: [] }],
    },
    {
      id: 8, kind: 'DEVICE', title: '', testType: null, status: 'RUNNING', verdict: null, stopReason: null, startedAt: null, peakVus: null, ai: null,
      targets: [
        { metric: 'AVG_FPS', scope: 'R3CT', op: '>=', value: 45, measured: 52.3, verdict: 'PASS', source: 'MANUAL' },
        { metric: 'MAX_MEM', scope: '', op: '<=', value: 1536, measured: null, verdict: 'FAIL', source: 'MANUAL' },
      ],
      devices: new Map([['R3CT', 'SM-S918N']]),
      rows: [],
      txs: [],
    },
  ],
  안정화: {
    errors: [{ state: 'NEW', title: 'TypeError <x>', source: 'WEB_CONSOLE', firstDay: '2026-11-12', firstBuildNo: '2.0', cases: 2, issueKey: 'XQ-12' }],
    summary: {
      status: 'DONE',
      결과: { headline: '콘솔 오류가 새로 났습니다', changes: [], features: [], verified: '해결 확인 없음', trend: '늘고 있습니다', errors: [] },
      changes: [{ state: 'NEW', text: '장바구니에서 처음 났습니다' }],
      features: [{ name: '장바구니', errorCases: 2 }],
    },
  },
};

function 재료(approval: 리포트응답['approval'] = null): 문서재료 {
  const summary: 첫장 = {
    kinds: ['FN', 'UI', 'E2E', 'COMPAT', 'PERF'],
    overview: { serviceName: 'XQ <웹>', env: 'qa', baseUrl: 'https://qa.xq.test', buildNo: '2.0', testsRepo: null, startedAt: '2026-11-12T01:00:00.000Z', finishedAt: null, performers: [], runs: 3, running: 1 },
    results: {
      functional: [{ kind: 'FN', result: { pass: 1, fail: 1, notRun: 0, unconfirmed: 0 } }, { kind: 'UI', result: { pass: 1, fail: 0, notRun: 0, unconfirmed: 0 } }, { kind: 'E2E', result: { pass: 0, fail: 1, notRun: 0, unconfirmed: 0 } }],
      nonFunctional: [
        { kind: 'COMPAT', quality: 'COMPATIBILITY', result: { devices: 2, screens: 5, suspect: 2 } },
        { kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: { runs: 2, pass: 2, fail: 1 } },
        { kind: 'STAB', quality: 'RELIABILITY', result: { day: '2026-11-12', days: 1, passErrorCases: 2, cases: 5, sources: [{ source: 'WEB_CONSOLE', cases: 2 }], residual: 3, newErrors: 1, reopened: 0, confirmed: 0 } },
      ],
    },
    plan: { cases: [], e2e: [], compat: [], perf: [] },
    failures: { counts: { PRODUCT: 0, TEST: 0, ENV: 0, UNCLASSIFIED: 0 }, items: [] },
    previous: null,
    changes: null,
  };
  return {
    리포트: { id: 4, service: 'XQ', env: 'qa', buildNo: '2.0', runId: null, perfRunId: null, version: 2, versions: [], summary, ai: null, runIds: [7, 8, 9], perfRunIds: [], performers: [], approval, updatedAt: '2026-11-12T03:00:00.000Z' },
    항목: [항목('XQ-FN-001', 'FAIL'), 항목('XQ-FN-002', 'PASS'), 항목('XQ-UI-001', 'PASS')],
    종류: new Map([['XQ-FN-001', 'FN'], ['XQ-FN-002', 'FN'], ['XQ-UI-001', 'UI']]),
    요구: [{ reqId: 'XQ-REQ-001', text: '로그인 <필수>', tcIds: ['XQ-FN-001'] }],
    화면: new Map([['XQ-UI-001', ['/login']]]),
    시나리오: [시나리오],
    비기능,
  };
}

const 칸글 = (h: string) => h.replace(/<td class="[ns]">/g, '<td>');

describe('QA 리포트 HTML', () => {
  const html = renderQaReportHtml(재료(), 'HTML');

  it('첫 장 다음에 기능 · UI · E2E 구획, 그다음 「비기능 검증」 구분 머리가 선다', () => {
    const 절 = (x: string) => `<h2 class="sec">${x}</h2>`;
    const 구획 = (x: string) => `<h2 class="sec part">${x}</h2>`;
    const 차례 = [
      절('1. 개요'), 절('2. 결과 요약'), 절('3. 계획 대비 차이'), 절('4. 실패 분류'), 절('5. 남은 리스크'), 절('6. 승인'), 구획('기능'), '>요구사항 추적표<', 구획('UI'), '>화면별<', 구획('E2E'),
      '<div class="divide">비기능 검증</div>', 구획('호환성 — 품질 특성 호환성'), 구획('성능 — 품질 특성 성능 효율성'), 구획('안정화 · 오류 종류 — 품질 특성 신뢰성'),
    ].map((x) => html.indexOf(x));
    expect(차례.every((x) => x > 0)).toBe(true);
    expect([...차례].sort((a, b) => a - b)).toEqual(차례);
  });

  it('추적표 · 화면별 · 흐름 한 줄에 케이스 판정을 적고 실패 케이스는 증적 카드로 그린다', () => {
    expect(html).toContain('<span>XQ-FN-001</span><span class="chip c-fail">실패</span>');
    expect(html).toContain('요구사항에 안 걸린 케이스');
    expect(html).toContain('/login');
    expect(html).toContain('<span class="st">1 XQ-FN-001 이름 · 통과</span><span class="ar">→</span><span class="st f">2 XQ-FN-002 이름 · 실패</span><span class="ar">→</span><span class="st n">3 XQ-FN-003 이름 · 실행 안 함</span>');
    expect(html).toContain('통과 1 · <span class="t-fail">실패 1</span>');
    expect(html).toMatch(/<section class="card">[\s\S]*XQ-FN-001/);
    expect(html).toContain('진행 중인 실행 1개');
  });

  it('사람이 적은 글은 가리고, 승인 전이면 옅은 「승인 전」 표시를 깐다', () => {
    expect(html).not.toContain('XQ <웹>');
    expect(html).toContain('XQ &lt;웹&gt;');
    expect(html).toContain('로그인 &lt;필수&gt;');
    expect(html).toContain('class="draft-mark"');
    expect(renderQaReportHtml(재료({ by: 'a', byName: 'A', at: '2026-11-13T00:00:00.000Z', late: false, sha256: 'x' }), 'HTML')).not.toContain('class="draft-mark"');
  });

  it('호환성은 디바이스 × 화면 격자로, 의심 칸은 노랑 · 판정한 결함은 빨간 글자, 미점검은 까닭을 디바이스마다 한 줄로', () => {
    expect(html).toContain('<table class="qa-table grid">');
    expect(html).toContain('<table class="qa-table wide">');
    expect(html).toContain('<th>2. SM-F946N · Android 14 · 펼침</th>');
    expect(칸글(html)).toContain('<td>결제 &lt;완료&gt;</td><td class="g-def">결함</td><td class="g-faint">미점검</td>');
    expect(html).toContain('<td class="g-sus">결함 의심</td><td class="g-ok">이상 없음</td>');
    expect(html).toContain('이상 없는 화면 3개는 표에서 뺐습니다');
    expect(html).toContain('텍스트 잘림 — 가격이 잘림');
    expect(칸글(html)).toContain('<td>2. SM-F946N</td><td>AI 사용 한도 초과로 점검 중단</td><td>1개</td>');
  });

  it('성능은 목표 · 잰 값 · 판정 표와 성능 PDF 의 AI 분석 · 추이 · 트랜잭션별을 싣는다', () => {
    expect(html).toContain('PRF-0007 장바구니 부하');
    expect(칸글(html)).toContain('<td>95% 응답시간</td><td>전체</td><td>≤ 0.8초</td><td>1.2초</td><td><div><span class="chip c-fail">미달</span></div></td><td>기획서 XQ-REQ-009</td>');
    expect(html).toContain('결제 API 가 느립니다\n· DB 잠금 대기');
    expect(html).toContain('<div class="trend"><svg');
    expect(칸글(html)).toContain('<td>POST /cart</td><td>1,200</td><td>1.00%</td>');
    expect(html).toContain('PRF-0008 기기 성능');
    expect(칸글(html)).toContain('<td>평균 FPS</td><td>SM-S918N (R3CT)</td><td>≥ 45.0 FPS</td><td>52.3 FPS</td>');
    expect(칸글(html)).toContain('<td>메모리 최대</td><td>전체</td>');
    expect(html).toContain('기기 성능 · 판정 진행 중');
  });

  it('안정화는 세 겹 머리 뒤에 신규 · 증가 · 재발 오류 종류와 AI 실행 요약을 그대로 싣는다', () => {
    expect(칸글(html)).toContain('<td>신규</td><td>TypeError &lt;x&gt;</td><td>콘솔 오류</td><td>2026-11-12 · 빌드 2.0</td><td>2건</td><td>XQ-12</td>');
    expect(html).toContain('콘솔 오류가 새로 났습니다');
    expect(html).toContain('신규 — 장바구니에서 처음 났습니다');
    expect(html).toContain('장바구니 2건');
  });

  it('PDF 는 접힌 줄의 상세를 부록으로 건다', () => {
    expect(renderQaReportHtml(재료(), 'PDF')).toContain('부록 — 접힌 줄의 상세');
  });
});

describe('QA 리포트 워드', () => {
  it('첫 장 · 구획 머리 · 케이스 목록 · E2E 단계를 글로 싣는다', async () => {
    const zip = await JSZip.loadAsync(await renderQaReportDocx(재료()));
    const 몸 = await zip.file('word/document.xml')!.async('string');
    for (const 글 of ['QA 리포트 — 빌드 2.0', '2. 결과 요약', '비기능 검증', '요구사항 추적표', 'XQ-FN-001 XQ-FN-001 이름', '구매 흐름', '1 XQ-FN-001 이름 · 통과 → 2 XQ-FN-002 이름 · 실패 → 3 XQ-FN-003 이름 · 실행 안 함', '로그인 &lt;필수&gt;'])
      expect(몸).toContain(글);
    for (const 글 of ['결제 &lt;완료&gt;', '결함 의심', 'PRF-0007 장바구니 부하', '1.2초', '시간대별 추이 그림은 PDF 에 있습니다', 'TypeError &lt;x&gt;', '콘솔 오류가 새로 났습니다']) expect(몸).toContain(글);
    expect(몸).toContain('w:gridSpan');
  });
});
