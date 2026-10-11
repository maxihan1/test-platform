// 표시용 모델을 증거 카드형(C 양식) A4 문서로 그린다. 이 HTML 이 곧 PDF 의 원본이다 (도메인/리포팅 §8.4)
// 가공하지 않는다 — 라벨·마스킹·빈 값은 collect.ts 가 이미 끝냈다. 여기서 또 하면 마스킹이 새는 자리가 둘이 된다

import type { EvidenceDocument, EvidenceItem } from './collect.js';
import { 디바이스순서 } from './failuresShape.js';
import { 디바이스, 본문, 안전, 판정, 판정글자, 항목줄 } from './htmlItem.js';
import { 증적스타일 } from './htmlStyle.js';
import { 판정줄 } from './summary.js';

export interface RenderOptions {
  /** 문서 머리말의 「만든 시각」. 렌더 입력으로 받는다 — 함수 안에서 new Date() 를 부르면 재현성이 깨진다 (SPEC §3.3) */
  generatedAt: string;
  /** 접힌 줄을 HTML 은 그 자리에서 펼치고(details) PDF 는 부록으로 건다 — 닫힌 details 는 인쇄되지 않는다 */
  format: 'HTML' | 'PDF';
}

/** 번호는 doc.items 안 자리다 — 부록 고리 이름(`i-번호`)이라 같은 모델이면 같은 글자가 나온다 (SPEC §3.3) */
interface 칸 {
  item: EvidenceItem;
  번호: number;
}

interface 케이스 {
  tcId: string;
  tcName: string;
  칸들: 칸[];
  /** 실행 때 박제한 사유다. 한 실행 안의 같은 케이스는 같은 값을 받는다 (run_item.unconfirmed) */
  미확정: string | null;
}

// 케이스 번호 차례다. 화면 카드는 신규 실패를 먼저 세우지만 그 변화는 다른 실행의 값이라 문서에 안 넣는다 (도메인/리포팅 §8.4).
// localeCompare 를 쓰지 않는다 — 서버 언어 설정에 따라 차례가 바뀌면 같은 실행의 문서가 달라진다 (SPEC §3.3)
function 케이스로(items: EvidenceItem[]): 케이스[] {
  const 표 = new Map<string, 케이스>();
  items.forEach((item, 번호) => {
    const c = 표.get(item.tcId) ?? { tcId: item.tcId, tcName: item.tcName, 칸들: [], 미확정: null };
    c.칸들.push({ item, 번호 });
    c.미확정 ??= item.unconfirmed;
    표.set(item.tcId, c);
  });
  for (const c of 표.values()) {
    c.칸들.sort(
      (a, b) =>
        디바이스순서.indexOf(a.item.platform) - 디바이스순서.indexOf(b.item.platform) || a.item.attempt - b.item.attempt,
    );
  }
  return [...표.values()].sort((a, b) => (a.tcId < b.tcId ? -1 : a.tcId > b.tcId ? 1 : 0));
}

// 판정 색을 쓰지 않는다 — 꼬리표일 뿐 판정이 아니다 (DESIGN.md 「판정 표기」 미확정)
function 미확정줄(c: 케이스): string[] {
  return c.미확정 === null ? [] : [`  <div class="u-reason">미확정 · ${안전(c.미확정)}</div>`];
}

function 케이스머리(c: 케이스, 줄판정: EvidenceItem['status']): string {
  return `${판정(줄판정)}<span class="tc-id">${안전(c.tcId)}</span><span class="tc-name">${안전(c.tcName)}</span>`;
}

function 펼친항목(k: 칸, 덧말 = '', id = ''): string[] {
  return [`  <div class="dev"${id}>`, `    <div class="dev-head">${항목줄(k.item, 덧말)}</div>`, ...본문(k.item), `  </div>`];
}

/**
 * 접힌 줄을 그리는 두 길. HTML 은 그 자리에서 펼치고, PDF 는 줄이 부록 고리가 되고 몸은 부록에 쌓는다.
 * 어느 길이든 모든 항목이 블록으로 문서에 남는다 — 검수처에 내는 서류에서 회차 하나도 빠지면 안 된다 (도메인/리포팅 §8.4)
 */
function 접기(format: RenderOptions['format']) {
  const 부록 = new Map<케이스, 칸[]>();
  const 싣는다 = (c: 케이스, 칸들: 칸[]) => 부록.set(c, [...(부록.get(c) ?? []), ...칸들]);

  return {
    항목(c: 케이스, k: 칸): string[] {
      if (format === 'HTML') {
        return [`  <details class="fold"><summary class="fold-line">${항목줄(k.item)}</summary><div class="fold-body">`, ...본문(k.item), `  </div></details>`];
      }
      싣는다(c, [k]);
      return [`  <a class="fold fold-line" href="#i-${k.번호}">${항목줄(k.item)}<span class="to-app">부록</span></a>`];
    },
    케이스(c: 케이스, 차례: number, 줄: string): string[] {
      if (format === 'HTML') {
        return [`<details class="fold"><summary class="fold-line">${줄}</summary><div class="fold-body">`, ...c.칸들.flatMap((k) => 펼친항목(k)), `</div></details>`];
      }
      싣는다(c, c.칸들);
      return [`<a class="fold fold-line" href="#c-${차례}">${줄}<span class="to-app">부록</span></a>`];
    },
    부록(차례표: Map<케이스, number>): string[] {
      if (부록.size === 0) return [];
      return [
        `<section class="appendix">`,
        `<h2 class="sec">부록 — 접힌 줄의 상세</h2>`,
        ...[...부록].flatMap(([c, 칸들]) => [
          `<section class="app-case" id="c-${차례표.get(c) ?? 0}">`,
          `  <h3 class="card-head">${케이스머리(c, 가장나쁜(c.칸들))}</h3>`,
          ...미확정줄(c),
          ...칸들.flatMap((k) => 펼친항목(k, '', ` id="i-${k.번호}"`)),
          `</section>`,
        ]),
        `</section>`,
      ];
    },
  };
}

function 가장나쁜(칸들: 칸[]): EvidenceItem['status'] {
  if (칸들.some((k) => k.item.status === 'FAIL')) return 'FAIL';
  return 칸들.every((k) => k.item.status === 'PASS') ? 'PASS' : 'NA';
}

function 디바이스별(칸들: 칸[]): 칸[][] {
  const 묶음 = new Map<EvidenceItem['platform'], 칸[]>();
  for (const k of 칸들) 묶음.set(k.item.platform, [...(묶음.get(k.item.platform) ?? []), k]);
  return [...묶음.values()];
}

// 깨진 디바이스마다 처음 실패한 회차 하나만 펼친다 — 화면 카드와 같다 (실행 §8.3). 나머지 회차 · 통과 디바이스는 접힌 줄이다
function 카드(c: 케이스, 접는다: ReturnType<typeof 접기>): string[] {
  const 펼침 = new Set<칸>();
  const 몸 = 디바이스별(c.칸들).flatMap((칸들) => {
    const 실패들 = 칸들.filter((k) => k.item.status === 'FAIL');
    const 처음 = 실패들[0];
    if (처음 === undefined) return [];
    펼침.add(처음);
    const 회차글 = 칸들.length > 1 ? `<span class="tries">${칸들.length}회 중 ${실패들.length}회 실패</span>` : '';
    return 펼친항목(처음, 회차글);
  });

  return [
    `<section class="card">`,
    `  <h3 class="card-head">${케이스머리(c, 'FAIL')}</h3>`,
    ...미확정줄(c),
    ...몸,
    ...c.칸들.filter((k) => !펼침.has(k)).flatMap((k) => 접는다.항목(c, k)),
    `</section>`,
  ];
}

// 통과 · 미실행 케이스 한 줄 — 디바이스마다 판정, 회차가 여럿이면 「3/3 통과」 (실행 §8.3 회차 요약)
function 줄글(c: 케이스): string {
  const 디바이스글 = 디바이스별(c.칸들)
    .map((칸들) => {
      const 첫 = 칸들[0]!.item;
      const 통과 = 칸들.filter((k) => k.item.status === 'PASS').length;
      return `${디바이스[첫.platform]} ${칸들.length === 1 ? 판정글자[첫.status] : `${통과}/${칸들.length} 통과`}`;
    })
    .join(' · ');
  const 사유 = c.칸들.find((k) => k.item.notRunReason !== null)?.item.notRunReason ?? null;
  return [
    케이스머리(c, 가장나쁜(c.칸들)),
    `<span class="devs">${디바이스글}</span>`,
    사유 === null ? '' : `<span class="not-run">${안전(사유)}</span>`,
    c.미확정 === null ? '' : `<span class="u-reason">미확정 · ${안전(c.미확정)}</span>`,
  ].join('');
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

export function renderHtml(doc: EvidenceDocument, options: RenderOptions): string {
  const h = doc.header;
  const 케이스들 = 케이스로(doc.items);
  const 차례표 = new Map(케이스들.map((c, i) => [c, i]));
  const 실패들 = 케이스들.filter((c) => c.칸들.some((k) => k.item.status === 'FAIL'));
  const 줄들 = 케이스들.filter((c) => !실패들.includes(c));
  const 접는다 = 접기(options.format);
  // 부록은 카드 · 줄을 다 그린 뒤에 모인다. 순서를 바꾸면 빈 부록이 나온다
  const 카드들 = 실패들.flatMap((c) => 카드(c, 접는다));
  const 줄목록 = 줄들.flatMap((c) => 접는다.케이스(c, 차례표.get(c) ?? 0, 줄글(c)));

  return [
    `<!doctype html>`,
    `<html lang="ko">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<title>${안전(h.serviceName)} 증적 문서 — RUN ${doc.runId}</title>`,
    `<style>${증적스타일}</style>`,
    `</head>`,
    `<body>`,
    `<div class="doc">`,
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
    `    <dt>만든 시각</dt><dd>${안전(options.generatedAt)}</dd>`,
    `  </dl>`,
    `</header>`,
    ...요약(doc.items),
    `<h2 class="sec">실패 케이스 ${실패들.length}건</h2>`,
    ...(실패들.length === 0 ? [`<p class="none">실패한 케이스가 없습니다</p>`] : 카드들),
    // 미확정도 따로 묶지 않고 제자리에 섞는다 — 줄마다 「미확정 · 사유」가 꼬리표 구실을 한다 (도메인/리포팅 · 실행 §3.2)
    ...(줄들.length === 0 ? [] : [`<h2 class="sec">통과 · 미실행 케이스 ${줄들.length}건</h2>`, ...줄목록]),
    ...접는다.부록(차례표),
    `</div>`,
    `</body>`,
    `</html>`,
  ].join('\n');
}
