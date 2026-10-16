// 표시용 모델을 증거 카드형(C 양식) A4 문서로 그린다. 이 HTML 이 곧 PDF 의 원본이다 (도메인/리포팅 §8.4)
// 가공하지 않는다 — 라벨·마스킹·빈 값은 collect.ts 가 이미 끝냈다. 여기서 또 하면 마스킹이 새는 자리가 둘이 된다

import type { EvidenceDocument, EvidenceHeader, EvidenceItem } from './collect.js';
import type { E2E요약줄 } from './e2eSummary.js';
import { 디바이스순서, 케이스로묶는다 } from './failuresShape.js';
import { 디바이스, 본문, 안전, 판정, 판정글자, 항목줄 } from './htmlItem.js';
import { 증적스타일 } from './htmlStyle.js';
import { 판정줄 } from './summary.js';

export interface RenderOptions {
  /** 문서 머리말의 「만든 시각」. 렌더 입력으로 받는다 — 함수 안에서 new Date() 를 부르면 재현성이 깨진다 (SPEC §3.3) */
  generatedAt: string;
  /** 접힌 줄을 HTML 은 그 자리에서 펼치고(details) PDF 는 부록으로 건다 — 닫힌 details 는 인쇄되지 않는다 */
  format: 'HTML' | 'PDF';
  /**
   * 차례 5 「E2E 요약」 — 그 서비스의 시나리오마다 마지막 실행. 만드는 시점에 읽어 넘긴다(generate.ts).
   * 비면(시나리오가 없거나 안 넘기면) 절을 그리지 않는다 (도메인/리포팅 §8.4)
   */
  e2e?: E2E요약줄[];
}

/** 번호는 doc.items 안 자리다 — 부록 고리 이름(`i-번호`)이라 같은 모델이면 같은 글자가 나온다 (SPEC §3.3) */
interface 칸 {
  item: EvidenceItem;
  번호: number;
}

interface 케이스 {
  /** 문서 안 케이스 차례 — 부록 고리 이름(`c-차례`)이다 */
  차례: number;
  tcId: string;
  tcName: string;
  칸들: 칸[];
  /** 실행 때 박제한 사유다. 한 실행 안의 같은 케이스는 같은 값을 받는다 (run_item.unconfirmed) */
  미확정: string | null;
  /** 카드에 펼칠 칸 — 깨진 디바이스마다 처음 실패한 회차. 비면 실패가 없는 케이스(줄)다 */
  펼침: { 칸: 칸; 회차글: string }[];
}

// 어느 회차를 펼치고 「N회 중 M회 실패」를 어떻게 세는지는 화면 카드와 같은 함수가 정한다 (실행 §8.3 · failuresShape.ts).
// 변화(신규 실패 · 연속 실패)는 다른 실행의 값이라 문서에 안 넣으므로 빈 표를 준다 (도메인/리포팅 §8.4)
function 케이스로(items: EvidenceItem[]): 케이스[] {
  const 행들 = items.map((item, 번호) => ({
    historyId: 번호,
    tcId: item.tcId,
    tcName: item.tcName,
    platform: item.platform,
    attempt: item.attempt,
    status: item.status === 'NOT_RUN' ? ('NA' as const) : item.status,
  }));
  const 실패표 = new Map(케이스로묶는다(행들, new Map()).map((c) => [c.tcId, c]));

  const 표 = new Map<string, 케이스>();
  items.forEach((item, 번호) => {
    const c = 표.get(item.tcId) ?? { 차례: 0, tcId: item.tcId, tcName: item.tcName, 칸들: [], 미확정: null, 펼침: [] };
    c.칸들.push({ item, 번호 });
    c.미확정 ??= item.unconfirmed;
    표.set(item.tcId, c);
  });

  // 화면 카드와 같은 비교다 — 변화가 없으면 화면도 케이스 번호 차례다.
  // 로캘은 못박는다 — 서버 언어 설정을 따르면 같은 실행의 문서 차례가 서버마다 달라질 수 있다 (SPEC §3.3)
  const 케이스들 = [...표.values()].sort((a, b) => a.tcId.localeCompare(b.tcId, 'en'));
  케이스들.forEach((c, 차례) => {
    c.차례 = 차례;
    c.칸들.sort(
      (a, b) =>
        디바이스순서.indexOf(a.item.platform) - 디바이스순서.indexOf(b.item.platform) || a.item.attempt - b.item.attempt,
    );
    c.펼침 = (실패표.get(c.tcId)?.devices ?? []).flatMap((d) => {
      const 칸 = c.칸들.find((k) => k.번호 === d.firstFailedHistoryId);
      const 회차글 = d.attempts > 1 ? `<span class="tries">${d.attempts}회 중 ${d.failedAttempts}회 실패</span>` : '';
      return 칸 === undefined ? [] : [{ 칸, 회차글 }];
    });
  });
  return 케이스들;
}

/** 펼치지 않은 칸 — 카드의 나머지 회차 · 통과 디바이스, 줄이면 전부. HTML 펼침과 PDF 부록이 같은 목록을 본다 */
function 접힌칸들(c: 케이스): 칸[] {
  return c.칸들.filter((k) => !c.펼침.some((p) => p.칸 === k));
}

// 판정 색을 쓰지 않는다 — 꼬리표일 뿐 판정이 아니다 (DESIGN.md 「판정 표기」 미확정)
function 미확정줄(c: 케이스): string[] {
  return c.미확정 === null ? [] : [`  <div class="u-reason">미확정 · ${안전(c.미확정)}</div>`];
}

// 화면 결과 줄의 거터 색과 같은 규칙이다 — 실패가 없고 전부 통과가 아니면 미실행 (web/RunResultRow.tsx worst)
function 가장나쁜(칸들: 칸[]): EvidenceItem['status'] {
  if (칸들.some((k) => k.item.status === 'FAIL')) return 'FAIL';
  return 칸들.every((k) => k.item.status === 'PASS') ? 'PASS' : 'NA';
}

function 케이스머리(c: 케이스): string {
  return `${판정(가장나쁜(c.칸들))}<span class="tc-id">${안전(c.tcId)}</span><span class="tc-name">${안전(c.tcName)}</span>`;
}

function 펼친항목(k: 칸, 덧말 = '', id = ''): string[] {
  return [`  <div class="dev"${id}>`, `    <div class="dev-head">${항목줄(k.item, 덧말)}</div>`, ...본문(k.item), `  </div>`];
}

/**
 * 접힌 줄 하나. HTML 은 그 자리에서 펼치고, PDF 는 줄이 부록 고리다 — 몸은 부록()이 같은 목록(접힌칸들)으로 그린다.
 * 어느 길이든 모든 항목이 블록으로 문서에 남는다 — 검수처에 내는 서류에서 회차 하나도 빠지면 안 된다 (도메인/리포팅 §8.4)
 */
function 접힌줄(format: RenderOptions['format'], 줄: string, 고리: string, 몸: () => string[]): string[] {
  if (format === 'HTML') {
    return [`<details class="fold"><summary class="fold-line">${줄}</summary><div class="fold-body">`, ...몸(), `</div></details>`];
  }
  return [`<a class="fold fold-line" href="#${고리}">${줄}<span class="to-app">부록에서 보기</span></a>`];
}

function 카드(c: 케이스, format: RenderOptions['format']): string[] {
  return [
    `<section class="card">`,
    `  <h3 class="card-head">${케이스머리(c)}</h3>`,
    ...미확정줄(c),
    ...c.펼침.flatMap((p) => 펼친항목(p.칸, p.회차글)),
    ...접힌칸들(c).flatMap((k) => 접힌줄(format, 항목줄(k.item), `i-${k.번호}`, () => 본문(k.item))),
    `</section>`,
  ];
}

// 통과 · 미실행 케이스 한 줄 — 디바이스마다 판정, 회차가 여럿이면 「3/3 통과」 (실행 §8.3 회차 요약)
function 줄글(c: 케이스): string {
  const 디바이스들 = 디바이스순서.flatMap((p) => {
    const 칸들 = c.칸들.filter((k) => k.item.platform === p);
    return 칸들.length === 0 ? [] : [{ p, 칸들 }];
  });
  const 디바이스글 = 디바이스들
    .map(({ p, 칸들 }) => {
      const 통과 = 칸들.filter((k) => k.item.status === 'PASS').length;
      return `${디바이스[p]} ${칸들.length === 1 ? 판정글자[칸들[0]!.item.status] : `${통과}/${칸들.length} 통과`}`;
    })
    .join(' · ');
  // 디바이스마다 사유가 다를 수 있다 — 하나만 남기면 나머지는 부록까지 가야 보인다
  const 사유 = [...new Set(c.칸들.flatMap((k) => (k.item.notRunReason === null ? [] : [k.item.notRunReason])))].join(' · ');
  return [
    케이스머리(c),
    `<span class="devs">${디바이스글}</span>`,
    사유 === '' ? '' : `<span class="not-run">${안전(사유)}</span>`,
    c.미확정 === null ? '' : `<span class="u-reason">미확정 · ${안전(c.미확정)}</span>`,
  ].join('');
}

function 부록(케이스들: 케이스[]): string[] {
  const 실을것 = 케이스들.flatMap((c) => {
    const 칸들 = 접힌칸들(c);
    return 칸들.length === 0 ? [] : [{ c, 칸들 }];
  });
  if (실을것.length === 0) return [];
  return [
    `<section class="appendix">`,
    `<h2 class="sec">부록 — 접힌 줄의 상세</h2>`,
    ...실을것.flatMap(({ c, 칸들 }) => [
      `<section class="app-case" id="c-${c.차례}">`,
      `  <h3 class="card-head">${케이스머리(c)}</h3>`,
      ...미확정줄(c),
      ...칸들.flatMap((k) => 펼친항목(k, '', ` id="i-${k.번호}"`)),
      `</section>`,
    ]),
    `</section>`,
  ];
}

// 화면 요약 띠의 숫자와 같다 — 통과율은 통과 ÷ 항목 전부, 회차를 접지 않고 미확정도 센다 (실행 §8.3)
function 요약(items: EvidenceItem[]): string[] {
  const 전체 = items.length;
  const 통과 = items.filter((i) => i.status === 'PASS').length;
  const 실패 = items.filter((i) => i.status === 'FAIL').length;
  return [
    `<section class="band">`,
    `  <div class="rate"><span class="big">${전체 === 0 ? '—' : `${((통과 / 전체) * 100).toFixed(1)}%`}</span><span class="axis">통과율</span></div>`,
    `  <div class="tally">`,
    `    <span class="${실패 > 0 ? 'verdict v-fail' : 'zero'}">실패 ${실패}건</span>`,
    `    <span>${전체 === 0 ? '항목 없음' : `항목 ${전체}건 중 ${통과}건 통과`}</span>`,
    `    <span class="axis">${안전(판정줄(items))}</span>`,
    `  </div>`,
    `</section>`,
  ];
}

// 시각은 머리말의 실행 시각과 같은 꼴(ISO)로 적는다 — 같은 문서 안에서 두 꼴이 섞이지 않게
function E2E요약절(줄들: E2E요약줄[]): string[] {
  if (줄들.length === 0) return [];
  return [
    `<h2 class="sec">E2E 요약</h2>`,
    `<p class="axis">이 요약은 문서를 만든 때 기준이다</p>`,
    ...줄들.map((z) => {
      const 이름 = `<span class="tc-id">SC-${z.scenarioId}</span><span class="tc-name">${안전(z.name)}</span>`;
      if (z.startedAt === null || z.verdict === null) return `<div class="fold fold-line">${이름}<span class="devs">실행 이력 없음</span></div>`;
      const 멈춘곳 = z.stoppedAt === null ? '모두 통과' : `${z.stoppedAt}번에서 멈춤`;
      const 미확정 = z.unconfirmed ? `<span class="badge">미확정</span>` : '';
      return `<div class="fold fold-line">${판정(z.verdict)}${이름}<span class="devs">${안전(z.startedAt)} · ${멈춘곳}</span>${미확정}</div>`;
    }),
    `<p class="axis">케이스 판정은 위 카드와 줄이 정본이다</p>`,
  ];
}

/** 문서 맨 앞 — 서비스 이름 · 저장소 주소 · 실행에 박제된 값들. E2E 증적(htmlScenario.ts)도 같은 머리를 쓴다 (도메인/리포팅 §8.4 「증적 문서 머리말」) */
export function 머리말(h: EvidenceHeader, generatedAt: string): string[] {
  return [
    `<header class="doc-head">`,
    `  <div class="service">${안전(h.serviceName)}</div>`,
    `  <div class="repo">${안전(h.testsRepo)}</div>`,
    `  <dl class="meta">`,
    `    <dt>실행 제목</dt><dd>${안전(h.title)}</dd>`,
    `    <dt>종류</dt><dd>${안전(h.kind)}</dd>`,
    `    <dt>실행 시각</dt><dd>${안전(h.startedAt)}</dd>`,
    `    <dt>실행자</dt><dd>${안전(h.triggeredByName)}</dd>`,
    `    <dt>대상 서버</dt><dd>${안전(h.env)}</dd>`,
    `    <dt>대상 주소</dt><dd>${안전(h.baseUrl)}</dd>`,
    `    <dt>만든 시각</dt><dd>${안전(generatedAt)}</dd>`,
    `  </dl>`,
    `</header>`,
  ];
}

/** 문서 껍데기 — 제목 · 글꼴 · 종이. 케이스 증적과 E2E 증적이 같은 판을 쓴다 */
export function 문서판(제목: string, 몸: string[]): string {
  return [
    `<!doctype html>`,
    `<html lang="ko">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<title>${안전(제목)}</title>`,
    `<style>${증적스타일}</style>`,
    `</head>`,
    `<body>`,
    `<div class="doc">`,
    ...몸,
    `</div>`,
    `</body>`,
    `</html>`,
  ].join('\n');
}

export function renderHtml(doc: EvidenceDocument, options: RenderOptions): string {
  const h = doc.header;
  const 실패들: 케이스[] = [];
  const 줄들: 케이스[] = [];
  for (const c of 케이스로(doc.items)) (c.펼침.length > 0 ? 실패들 : 줄들).push(c);

  return 문서판(`${h.serviceName} 증적 문서 — RUN ${doc.runId}`, [
    ...머리말(h, options.generatedAt),
    ...요약(doc.items),
    `<h2 class="sec">실패 케이스 ${실패들.length}건</h2>`,
    ...(실패들.length === 0 ? [`<p class="none">실패한 케이스가 없습니다</p>`] : 실패들.flatMap((c) => 카드(c, options.format))),
    // 미확정도 따로 묶지 않고 제자리에 섞는다 — 줄마다 「미확정 · 사유」가 꼬리표 구실을 한다 (도메인/리포팅 · 실행 §3.2)
    ...(줄들.length === 0
      ? []
      : [
          `<h2 class="sec">통과 · 미실행 케이스 ${줄들.length}건</h2>`,
          ...줄들.flatMap((c) => 접힌줄(options.format, 줄글(c), `c-${c.차례}`, () => c.칸들.flatMap((k) => 펼친항목(k)))),
        ]),
    ...E2E요약절(options.e2e ?? []),
    ...(options.format === 'PDF' ? 부록([...실패들, ...줄들]) : []),
  ]);
}
