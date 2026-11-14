// QA 리포트를 HTML 로 그린다 — 첫 장(글 덩이) → 종류별 구획(증적 카드 · E2E 단계 재사용) → PDF 부록. 이 HTML 이 곧 PDF 의 원본이다 (도메인/리포팅 §3.17)
// 글은 qaReportText.ts · qaReportSections.ts 가 지었다. 여기서는 모양만 입히고, 실리는 글은 하나도 빠짐없이 안전() 을 거친다
// 모양은 시안 B(문서 차례 — 번호 붙은 절 · 표 · 흐름 알약 · AI 상자 · 점선 승인 상자)를 증적 종이 색(htmlStyle.ts)으로 옮겼다. 증적 카드가 같은 문서에 들어가 색이 둘이면 안 된다

import { 추이 } from '../perf/pdfText.js';
import { 카드묶음, 문서판 } from './html.js';
import { 안전 } from './htmlItem.js';
import { 시나리오몸 } from './htmlScenario.js';
import type { 문서재료 } from './qaReportDoc.js';
import { 구획들 } from './qaReportSections.js';
import { 격자칸, 리포트제목, 빈글, 승인뒤다시, 첫장글, 시각, type 덩이 } from './qaReportText.js';

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
.qa-table td.s,.qa-table th.s{ white-space:nowrap; }
/* 「비기능 검증」 구분 띠 — 기능 구획과 비기능 구획 사이. 구획 머리(.part)보다 한 단 위라 선 사이에 글을 둔다 */
.divide{ display:flex; align-items:center; gap:12px; margin:40px 0 0; font-size:13px; font-weight:600; color:var(--chrome); letter-spacing:.06em; }
.divide::before,.divide::after{ content:''; flex:1; border-top:1.5px solid var(--ink); }
.qa-p.minor{ font-size:12.5px; font-weight:600; color:var(--ink-muted); margin:12px 0 4px; }
/* 호환성 격자 — 칸 하나에 꽉 찬 배지를 두지 않고 글자로 판정을 적는다. 의심은 「먼저 볼 것」이라 노랑, 판정한 결함만 판정 빨강 */
.qa-table.grid td:not(:first-child),.qa-table.grid th:not(:first-child){ text-align:center; }
.qa-table.grid td:first-child{ min-width:120px; }
.qa-table.grid td.g-ok{ color:var(--pass); }
.qa-table.grid td.g-sus{ background:#FBF0D9; color:#7A5208; font-weight:600; }
.qa-table.grid td.g-def{ color:var(--fail); font-weight:600; }
.qa-table.grid td.g-faint{ color:var(--ink-faint); }
.trend svg{ display:block; margin:4px 0; }
.trend p{ font-size:12px; color:var(--ink-muted); }
@media print{ .qa-table tr{ break-inside:avoid; } .sub,.part{ break-after:avoid; } .box-ai,.box-sign{ break-inside:avoid; } }
/* 폰에서 HTML 을 열 때 — A4 폭(186mm)이면 옆으로 밀린다. 화면 폭에 맞추고 표는 칸 안에서 줄을 바꾼다 */
@media screen and (max-width:760px){
  body{ font-size:14px; }
  .doc{ width:auto; padding:16px; }
  .cover{ flex-direction:column-reverse; gap:6px; }
  .tbl{ overflow-x:auto; }
  /* 칸이 다섯 넘는 표는 폰 폭에 눌러 담으면 글자가 한 글자씩 세로로 꺾인다 — 표 칸 안에서만 옆으로 넘긴다(문서는 안 밀린다) */
  .qa-table.wide{ min-width:600px; }
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

const 판정꼴: Record<string, string> = { 통과: 'c-pass', 실패: 'c-fail', 미달: 'c-fail', 미실행: 'c-na', '실행 안 함': 'c-na', 적용됨: 'c-na' };
const 격자꼴: Record<string, string> = { [격자칸.OK]: 'g-ok', [격자칸.PENDING]: 'g-sus', [격자칸.CONFIRMED]: 'g-def', [격자칸.NOT_DEFECT]: 'g-faint', [격자칸.UNCHECKED]: 'g-faint', [빈글.기록없음]: 'g-faint' };

// 판정 칸의 줄은 「<케이스> <판정>」 이거나 판정 하나다 — 판정 낱말만 색 칩으로 뗀다
function 판정줄(줄: string): string {
  const 낱말 = Object.keys(판정꼴).find((w) => 줄 === w || 줄.endsWith(` ${w}`));
  if (낱말 === undefined) return `<div>${안전(줄)}</div>`;
  const 앞 = 줄.slice(0, 줄.length - 낱말.length).trim();
  // 판정 하나뿐인 칸(성능 목표 표)은 칩을 머리 글자 아래 왼쪽에 둔다 — 빈 이름 칸이 칩을 오른쪽 끝으로 밀었다
  if (앞 === '') return `<div><span class="chip ${판정꼴[낱말]}">${낱말}</span></div>`;
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
  // 짧은 글만 든 열(구분 · 출처 · 판정 전)은 줄을 안 바꾼다 — 폰 폭에서 「신/규」처럼 한 글자씩 꺾였다
  const 짧은열 = (i: number) => d.머리.length > 0 && 본줄.length > 0 && (d.머리[i] ?? '').length <= 7 && 본줄.every((z) => (z.칸[i] ?? '').length <= 7);
  const n = (i: number) => (숫자열(i) ? ' class="n"' : 짧은열(i) ? ' class="s"' : '');
  const 칸 = (글: string, i: number) => {
    if (i === d.판정칸) return `<td>${글.split('\n').map(판정줄).join('')}</td>`;
    if (d.격자 === true && i > 0) return `<td class="${격자꼴[글] ?? ''}">${안전(글)}</td>`;
    return `<td${n(i)}>${수강조(안전(글))}</td>`;
  };
  return [
    `<div class="tbl"><table class="qa-table${d.머리.length === 0 ? ' kv' : ''}${d.격자 === true ? ' grid' : ''}${폭 >= 5 ? ' wide' : ''}">`,
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
    case '구분':
      return [`<div class="divide">${안전(d.글)}</div>`];
    case '글':
      return [`<p class="qa-p${d.결 === '흐림' ? ' faint' : d.결 === '강조' ? ' emph' : d.결 === '머리' ? ' minor' : ''}">${안전(d.글)}</p>`];
    case '추이':
      // 성능 PDF 와 같은 그림 — 그 함수가 숫자만 넣어 글을 그리므로 따로 가리지 않는다
      return [`<div class="trend">${d.rows.length === 0 ? `<p>${빈글.추이숫자없음}</p>` : 추이(d.rows)}</div>`];
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
  // 승인한 버전의 PDF 는 승인 때 한 번 굳힌 그 파일이 기준 문서다 — 「받을 때 다시 만들었다」는 HTML 에만 단다
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
    `  <div><div class="kicker">애플리케이션 QA 리포트</div><h1>${안전(리포트제목(r))}</h1><div class="when">버전 ${r.version} · ${안전(시각(r.updatedAt))} 기준</div>${승인됨 && format === 'HTML' ? `<div class="redo">${안전(승인뒤다시)}</div>` : ''}</div>`,
    `  <span class="state ${승인됨 ? 'ok' : 'draft'}">${승인됨 ? '승인됨' : '승인 전'}</span>`,
    `</header>`,
    `<section class="first-page">`,
    ...첫장(첫장글(r)),
    `</section>`,
    ...구획,
    ...카드.부록,
  ]);
}
