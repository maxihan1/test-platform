// QA 리포트를 HTML 로 그린다 — 첫 장(글 덩이) → 종류별 구획(증적 카드 · E2E 단계 재사용) → PDF 부록. 이 HTML 이 곧 PDF 의 원본이다 (도메인/리포팅 §3.17)
// 글은 qaReportText.ts · qaReportSections.ts 가 지었다. 여기서는 모양만 입히고, 실리는 글은 하나도 빠짐없이 안전() 을 거친다
// 모양은 시안 B(문서 차례 — 번호 붙은 절 · 표 · 흐름 알약 · AI 상자 · 점선 승인 상자)를 증적 종이 색(htmlStyle.ts)으로 옮겼다. 증적 카드가 같은 문서에 들어가 색이 둘이면 안 된다

import { 카드묶음, 문서판 } from './html.js';
import { 안전 } from './htmlItem.js';
import { 시나리오몸 } from './htmlScenario.js';
import type { 문서재료 } from './qaReportDoc.js';
import { 구획들 } from './qaReportSections.js';
import { 리포트제목, 승인뒤다시, 첫장글, 시각, type 덩이 } from './qaReportText.js';

const 리포트스타일 = `<style>
.cover{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; border-bottom:2px solid var(--ink); padding-bottom:12px; margin-bottom:8px; }
.cover .kicker{ font-size:12px; font-weight:600; color:var(--chrome); letter-spacing:.04em; }
.cover h1{ font-size:21px; font-weight:600; line-height:1.35; margin-top:2px; }
.cover .when{ font-size:12.5px; color:var(--ink-muted); margin-top:2px; }
.cover .redo{ font-size:12px; color:var(--ink-muted); margin-top:4px; }
.state{ flex:none; font-size:12.5px; font-weight:600; border-radius:999px; padding:3px 12px; white-space:nowrap; }
.state.draft{ background:#F7E6D8; color:var(--chrome); }
.state.ok{ background:var(--pass-bg); color:var(--pass); }
.first-page .sec{ font-size:15.5px; margin:26px 0 10px; padding-bottom:5px; border-bottom:1.5px solid var(--ink); }
.first-page .sec:first-of-type{ margin-top:14px; }
.doc .sec.part{ font-weight:600; font-size:17px; margin:30px 0 8px; padding:8px 12px; border-bottom:0; background:var(--chip); border-left:4px solid var(--chrome); border-radius:2px; }
.sub{ font-size:13.5px; font-weight:600; margin:16px 0 6px; padding-left:8px; border-left:3px solid var(--rule); }
.tbl{ border:1px solid var(--rule); border-radius:6px; overflow:hidden; margin:6px 0 12px; }
.qa-table{ width:100%; border-collapse:collapse; font-size:12.5px; }
.qa-table th{ text-align:left; font-weight:600; font-size:12px; color:var(--ink-muted); background:var(--chip); padding:6px 9px; }
.qa-table td{ border-top:1px solid var(--rule-soft); padding:6px 9px; vertical-align:top; white-space:pre-line; word-break:break-word; }
.qa-table tbody tr:first-child td{ border-top:0; }
.qa-table thead + tbody tr:first-child td{ border-top:1px solid var(--rule); }
.qa-table tr.group td{ background:var(--rule-soft); font-weight:600; font-size:12px; color:var(--ink-muted); letter-spacing:.02em; }
/* 강조(기대 결과 변경 · 판정이 필요한 실패)는 판정이 아니라 「먼저 볼 것」이다 — 판정 색(빨강)을 쓰지 않는다 (DESIGN.md 「색은 판정만 갖는다」) */
.qa-table tr.emph td{ background:#FBF0D9; }
.qa-table tr.emph td:first-child{ box-shadow:inset 3px 0 0 #B07A12; }
.qa-table.kv td:first-child{ width:112px; color:var(--ink-muted); font-weight:600; background:#FAF8F3; }
.v-line{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.v-line + .v-line{ margin-top:3px; }
.chip{ flex:none; font-size:11.5px; font-weight:600; border-radius:999px; padding:0 8px; line-height:1.7; }
.c-pass{ background:var(--pass-bg); color:var(--pass); }
.c-fail{ background:var(--fail); color:#fff; }
.c-na{ background:var(--na-bg); color:var(--na); }
.qa-p{ margin:4px 0 8px; white-space:pre-line; }
.t-fail{ color:var(--fail); font-weight:600; }
.qa-p.faint{ font-size:12.5px; color:var(--ink-muted); }
.qa-p.emph{ display:inline-block; font-weight:600; color:#7A5208; background:#FBF0D9; border-radius:4px; padding:2px 9px; }
.flow{ display:flex; flex-wrap:wrap; align-items:center; gap:5px 3px; margin:6px 0 10px; font-size:12.5px; }
.flow .st{ border-radius:999px; padding:2px 10px; background:var(--pass-bg); color:var(--pass); }
.flow .st.f{ background:var(--fail); color:#fff; font-weight:600; }
.flow .st.n{ background:var(--na-bg); color:var(--na); }
.flow .ar{ color:var(--ink-faint); }
.box-ai{ border:1px solid var(--rule); border-radius:6px; background:var(--chip); padding:10px 14px; }
.box-ai .qa-p.faint:first-child{ font-weight:600; color:var(--chrome); }
.box-sign{ border:1.5px dashed var(--ink-faint); border-radius:6px; padding:12px 14px; }
.box-sign .qa-p.emph{ color:var(--ink); background:none; padding:0; font-size:14px; }
.first-page{ break-after:page; }
.draft-mark{ position:fixed; top:42%; left:0; right:0; text-align:center; font-size:88px; font-weight:600; color:var(--chrome); opacity:0.07; transform:rotate(-24deg); pointer-events:none; z-index:0; }
/* 꽉 찬 판정 배지는 케이스 머리 하나만 — 디바이스 · 절차 · 확인 줄까지 배지면 실패 하나에 빨간 배지가 넷 선다(2026-11-14 사용자 「넘 많이 보이잖아」).
   아래 줄들은 배경 없는 색 글자로 판정을 적는다. 글자가 남아 흑백 인쇄에도 읽힌다 (DESIGN.md 원칙 5) */
.dev-head .verdict,.step-head .verdict,.assert .verdict{ background:none; min-width:0; padding:0; border-radius:0; }
.dev-head .verdict.v-fail,.step-head .verdict.v-fail,.assert .verdict.v-fail{ color:var(--fail); }
.dev-head .verdict.v-pass,.step-head .verdict.v-pass,.assert .verdict.v-pass{ color:var(--pass); }
.dev-head .verdict.v-na,.step-head .verdict.v-na,.assert .verdict.v-na{ color:var(--na); }
/* 판정 글자를 한 세로줄에 — 절차 줄은 「판정 (소요)」, 확인 줄은 「판정」으로 끝나 엇갈린다. 판정 · 소요 칸 폭을 고정하고 확인 줄 오른쪽을 소요 칸만큼 비운다 */
.step-head .verdict,.assert .verdict{ width:40px; text-align:right; }
.step-head .ms,.card-head .ms{ flex:none; width:64px; text-align:right; }
.assert{ padding-right:72px; }
.qa-table td.n,.qa-table th.n{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
@media print{ .qa-table tr{ break-inside:avoid; } .sub,.part{ break-after:avoid; } .box-ai,.box-sign{ break-inside:avoid; } }
/* 폰에서 HTML 을 열 때 — A4 폭(186mm)이면 옆으로 밀린다. 화면 폭에 맞추고 표는 칸 안에서 줄을 바꾼다 */
@media screen and (max-width:760px){
  body{ font-size:14px; }
  .doc{ width:auto; padding:16px; }
  .cover{ flex-direction:column-reverse; gap:6px; }
  .tbl{ overflow-x:auto; }
  .qa-table.kv td:first-child{ width:88px; }
  .meta{ grid-template-columns:84px 1fr; }
  .assert{ flex-wrap:wrap; padding-right:6px; }
  .exp,.act{ width:auto; }
  .f-label{ width:96px; }
  .step-head .ms,.card-head .ms{ width:auto; }
  .draft-mark{ font-size:56px; }
  /* 줄 끝 글이 케이스 이름 · 확인 문장을 한 글자 폭까지 누르지 않게 이름에 자리를 먼저 주고 나머지는 다음 줄로 내린다 */
  .fold-line .tc-name{ min-width:55%; }
  .assert .stmt{ flex-basis:100%; }
  .step-title{ min-width:50%; }
}
</style>`;

const 판정꼴: Record<string, string> = { 통과: 'c-pass', 실패: 'c-fail', 미실행: 'c-na', '실행 안 함': 'c-na', 적용됨: 'c-na' };

// 판정 칸의 줄은 「<케이스> <판정>」 이거나 판정 하나다 — 판정 낱말만 색 칩으로 뗀다
function 판정줄(줄: string): string {
  const 낱말 = Object.keys(판정꼴).find((w) => 줄 === w || 줄.endsWith(` ${w}`));
  if (낱말 === undefined) return `<div>${안전(줄)}</div>`;
  const 앞 = 줄.slice(0, 줄.length - 낱말.length).trim();
  return `<div class="v-line"><span>${안전(앞)}</span><span class="chip ${판정꼴[낱말]}">${낱말}</span></div>`;
}

// 0 이 아닌 실패 · 미달 수는 빨간 굵은 글자로 — 결과 요약에서 먼저 눈에 걸려야 한다(시안 B).
// 결과 칸 꼴(「통과 N · 실패 N」 · 「성능 목표 통과 N · 미달 N」)일 때만 건다 — 요구사항 문장 「실패 5회 시 잠금」이 판정처럼 칠해지면 안 된다
const 수강조 = (글: string): string => 글.replace(/^((?:성능 목표 )?통과 \d+ · )(실패|미달) ([1-9]\d*)/, '$1<span class="t-fail">$2 $3</span>');

function 표(d: Extract<덩이, { 꼴: '표' }>): string[] {
  const 폭 = Math.max(d.머리.length, ...d.줄.map((z) => z.칸.length));
  // 숫자 · 건수만 든 열(「2건」 · 「3개」)은 머리까지 오른쪽으로 붙인다 — 개요 같은 이름-값 표(머리 없음)의 빌드 번호는 글이라 뺀다
  const 본줄 = d.줄.filter((z) => z.결 !== '묶음');
  const 숫자열 = (i: number) => d.머리.length > 0 && 본줄.length > 0 && 본줄.every((z) => /^\d[\d,]*(건|개|회)?$/.test(z.칸[i] ?? ''));
  const n = (i: number) => (숫자열(i) ? ' class="n"' : '');
  const 칸 = (글: string, i: number) => (i === d.판정칸 ? `<td>${글.split('\n').map(판정줄).join('')}</td>` : `<td${n(i)}>${수강조(안전(글))}</td>`);
  return [
    `<div class="tbl"><table class="qa-table${d.머리.length === 0 ? ' kv' : ''}">`,
    ...(d.머리.length === 0 ? [] : [`<thead><tr>${d.머리.map((m, i) => `<th${n(i)}>${안전(m)}</th>`).join('')}</tr></thead>`]),
    '<tbody>',
    // 묶음 머리 줄은 한 칸이 표 폭 전부를 덮는다
    ...d.줄.map((z) =>
      z.결 === '묶음' ? `<tr class="group"><td colspan="${폭}">${안전(z.칸[0] ?? '')}</td></tr>` : `<tr${z.결 === '강조' ? ' class="emph"' : ''}>${z.칸.map(칸).join('')}</tr>`,
    ),
    '</tbody>',
    '</table></div>',
  ];
}

function 덩이로(d: 덩이, 절꼴 = 'sec'): string[] {
  switch (d.꼴) {
    case '절':
      return [`<h2 class="${절꼴}">${안전(d.글)}</h2>`];
    case '소절':
      return [`<h3 class="sub">${안전(d.글)}</h3>`];
    case '글':
      return [`<p class="qa-p${d.결 === '흐림' ? ' faint' : d.결 === '강조' ? ' emph' : ''}">${안전(d.글)}</p>`];
    case '표':
      return 표(d);
    case '흐름':
      return [
        `<div class="flow">${d.단계
          // 판정을 색만으로 전하지 않는다 — 흑백으로 뽑아도 읽히게 알약마다 판정 글자를 단다 (DESIGN.md 원칙 5)
          .map((s) => `<span class="st${s.판정 === '실패' ? ' f' : s.판정 === '통과' ? '' : ' n'}">${안전(s.글)} · ${안전(s.판정)}</span>`)
          .join('<span class="ar">→</span>')}</div>`,
      ];
  }
}

// 남은 리스크는 AI 상자, 승인은 점선 상자 — 절 머리 뒤 덩이들을 다음 절까지 감싼다
function 첫장(덩이들: 덩이[]): string[] {
  const 줄: string[] = [];
  let 상자: string | null = null;
  for (const d of 덩이들) {
    if (d.꼴 === '절') {
      if (상자 !== null) 줄.push('</div>');
      줄.push(...덩이로(d));
      상자 = d.상자 === 'AI' ? 'box-ai' : d.상자 === '승인' ? 'box-sign' : null;
      if (상자 !== null) 줄.push(`<div class="${상자}">`);
      continue;
    }
    줄.push(...덩이로(d));
  }
  if (상자 !== null) 줄.push('</div>');
  return 줄;
}

export function renderQaReportHtml(재료: 문서재료, format: 'HTML' | 'PDF'): string {
  const r = 재료.리포트;
  const 카드 = 카드묶음(재료.항목, format);
  const 승인됨 = r.approval !== null;
  const 구획 = 구획들(재료).flatMap((g) => [
    ...g.머리.flatMap((d) => 덩이로(d, 'sec part')),
    ...(g.케이스 === undefined ? [] : 카드.구획((tcId) => 재료.종류.get(tcId) === g.케이스)),
    // 시나리오 제목은 증적 띠가 이미 적는다 — 띠 아래에 흐름 알약을 두고 「단계별 결과」는 소제목으로 낮춘다
    ...(g.시나리오 ?? []).flatMap((s) => {
      const [띠, ...몸] = 시나리오몸(s.doc, (글) => `<h3 class="sub">${글}</h3>`);
      return [띠 ?? '', ...s.머리.filter((d) => d.꼴 === '흐름').flatMap((d) => 덩이로(d)), ...몸];
    }),
  ]);
  return 문서판(리포트제목(r), [
    리포트스타일,
    // 승인 전 버전은 다시 만들 때마다 바뀐다 — 문서 전체에 옅게 깔아 어느 때 것인지 보이게 한다 (§3.17 「묶음 · 버전」)
    ...(승인됨 ? [] : [`<div class="draft-mark">승인 전</div>`]),
    `<header class="cover">`,
    `  <div><div class="kicker">애플리케이션 QA 리포트</div><h1>${안전(리포트제목(r))}</h1><div class="when">버전 ${r.version} · ${안전(시각(r.updatedAt))} 기준</div>${승인됨 ? `<div class="redo">${안전(승인뒤다시)}</div>` : ''}</div>`,
    `  <span class="state ${승인됨 ? 'ok' : 'draft'}">${승인됨 ? '승인됨' : '승인 전'}</span>`,
    `</header>`,
    `<section class="first-page">`,
    ...첫장(첫장글(r)),
    `</section>`,
    ...구획,
    ...카드.부록,
  ]);
}
