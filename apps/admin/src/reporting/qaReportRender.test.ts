// QA 리포트 HTML · 워드 — 첫 장 뒤 기능 · UI · E2E 구획 · 「비기능 검증」 구분 머리 · 승인 전 표시 · 글 가리기. 순수 함수라 DB 를 쓰지 않는다
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import type { EvidenceItem } from './collect.js';
import type { E2E증적 } from './collectScenario.js';
import type { 문서재료, 리포트응답 } from './qaReportDoc.js';
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

function 재료(approval: 리포트응답['approval'] = null): 문서재료 {
  const summary: 첫장 = {
    kinds: ['FN', 'UI', 'E2E'],
    overview: { serviceName: 'XQ <웹>', env: 'qa', baseUrl: 'https://qa.xq.test', buildNo: '2.0', testsRepo: null, startedAt: '2026-11-12T01:00:00.000Z', finishedAt: null, performers: [], runs: 3, running: 1 },
    results: {
      functional: [{ kind: 'FN', result: { pass: 1, fail: 1, notRun: 0, unconfirmed: 0 } }, { kind: 'UI', result: { pass: 1, fail: 0, notRun: 0, unconfirmed: 0 } }, { kind: 'E2E', result: { pass: 0, fail: 1, notRun: 0, unconfirmed: 0 } }],
      nonFunctional: [
        { kind: 'COMPAT', quality: 'COMPATIBILITY', result: null },
        { kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: null },
        { kind: 'STAB', quality: 'RELIABILITY', result: null },
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
  };
}

describe('QA 리포트 HTML', () => {
  const html = renderQaReportHtml(재료(), 'HTML');

  it('첫 장 다음에 기능 · UI · E2E 구획, 그다음 「비기능 검증」 구분 머리가 선다', () => {
    const 절 = (x: string) => `<h2 class="sec">${x}</h2>`;
    const 구획 = (x: string) => `<h2 class="sec part">${x}</h2>`;
    const 차례 = [절('1. 개요'), 절('2. 결과 요약'), 절('3. 계획 대비 차이'), 절('4. 실패 분류'), 절('5. 남은 리스크'), 절('6. 승인'), 구획('기능'), '>요구사항 추적표<', 구획('UI'), '>화면별<', 구획('E2E'), 구획('비기능 검증')].map((x) => html.indexOf(x));
    expect(차례.every((x) => x > 0)).toBe(true);
    expect([...차례].sort((a, b) => a - b)).toEqual(차례);
    expect(html).toContain('안정화 · 오류 종류 — 신뢰성');
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

  it('PDF 는 접힌 줄의 상세를 부록으로 건다', () => {
    expect(renderQaReportHtml(재료(), 'PDF')).toContain('부록 — 접힌 줄의 상세');
  });
});

describe('QA 리포트 워드', () => {
  it('첫 장 · 구획 머리 · 케이스 목록 · E2E 단계를 글로 싣는다', async () => {
    const zip = await JSZip.loadAsync(await renderQaReportDocx(재료()));
    const 몸 = await zip.file('word/document.xml')!.async('string');
    for (const 글 of ['QA 리포트 — 빌드 2.0', '2. 결과 요약', '비기능 검증', '요구사항 추적표', 'XQ-FN-001 XQ-FN-001 이름', '구매 흐름', '1 XQ-FN-001 이름 · 통과 → 2 XQ-FN-002 이름 · 실패 → 3 XQ-FN-003 이름 · 실행 안 함', '로그인 &lt;필수&gt;']) expect(몸).toContain(글);
    expect(몸).toContain('w:gridSpan');
  });
});
