// QA 리포트를 HTML 로 그린다 — 첫 장(글 덩이) → 종류별 구획(증적 카드 · E2E 단계 재사용) → PDF 부록. 이 HTML 이 곧 PDF 의 원본이다 (도메인/리포팅 §3.17)
// 글은 qaReportText.ts · qaReportSections.ts 가 지었다. 여기서는 모양만 입히고, 실리는 글은 하나도 빠짐없이 안전() 을 거친다

import { 카드묶음, 문서판 } from './html.js';
import { 안전 } from './htmlItem.js';
import { 시나리오몸 } from './htmlScenario.js';
import type { 문서재료 } from './qaReportDoc.js';
import { 구획들 } from './qaReportSections.js';
import { 리포트제목, 첫장글, 시각, type 덩이 } from './qaReportText.js';

// 증적 판(htmlStyle.ts) 위에 첫 장에만 쓰는 것을 더한다 — 표 · 소제목 · 「승인 전」 옅은 표시
const 리포트스타일 = `<style>
.sub{ font-size:14px; font-weight:600; margin:16px 0 8px; }
.qa-table{ width:100%; border-collapse:collapse; margin:6px 0 10px; font-size:12.5px; }
.qa-table th{ text-align:left; font-weight:600; color:var(--ink-faint); border-bottom:1px solid var(--rule); padding:4px 6px; }
.qa-table td{ border-bottom:1px solid var(--rule-soft); padding:5px 6px; vertical-align:top; white-space:pre-line; word-break:break-word; }
.qa-table tr.group td{ background:var(--chip); font-weight:600; }
.qa-table tr.emph td{ background:var(--fail-bg); }
.qa-table.kv td:first-child{ width:110px; color:var(--ink-faint); font-weight:600; }
.qa-p{ margin:4px 0 8px; white-space:pre-line; }
.qa-p.faint{ font-size:12.5px; color:var(--ink-muted); }
.qa-p.emph{ font-weight:600; color:var(--fail); }
.first-page{ break-after:page; }
.draft-mark{ position:fixed; top:42%; left:0; right:0; text-align:center; font-size:88px; font-weight:600; color:var(--fail); opacity:0.06; transform:rotate(-24deg); pointer-events:none; z-index:0; }
@media print{ .qa-table tr{ break-inside:avoid; } .sub{ break-after:avoid; } }
</style>`;

const 칸 = (글: string, 꼴: 'td' | 'th' = 'td', 넓이 = 1) => `<${꼴}${넓이 > 1 ? ` colspan="${넓이}"` : ''}>${안전(글)}</${꼴}>`;

function 덩이로(d: 덩이): string[] {
  switch (d.꼴) {
    case '절':
      return [`<h2 class="sec">${안전(d.글)}</h2>`];
    case '소절':
      return [`<h3 class="sub">${안전(d.글)}</h3>`];
    case '글':
      return [`<p class="qa-p${d.결 === '흐림' ? ' faint' : d.결 === '강조' ? ' emph' : ''}">${안전(d.글)}</p>`];
    case '표': {
      const 폭 = Math.max(d.머리.length, ...d.줄.map((z) => z.칸.length));
      return [
        `<table class="qa-table${d.머리.length === 0 ? ' kv' : ''}">`,
        ...(d.머리.length === 0 ? [] : [`<thead><tr>${d.머리.map((m) => 칸(m, 'th')).join('')}</tr></thead>`]),
        '<tbody>',
        // 묶음 머리 줄은 한 칸이 표 폭 전부를 덮는다
        ...d.줄.map((z) => (z.결 === '묶음' ? `<tr class="group">${칸(z.칸[0] ?? '', 'td', 폭)}</tr>` : `<tr${z.결 === '강조' ? ' class="emph"' : ''}>${z.칸.map((c) => 칸(c)).join('')}</tr>`)),
        '</tbody>',
        '</table>',
      ];
    }
  }
}

export function renderQaReportHtml(재료: 문서재료, format: 'HTML' | 'PDF'): string {
  const r = 재료.리포트;
  const 카드 = 카드묶음(재료.항목, format);
  const 구획 = 구획들(재료).flatMap((g) => [
    ...g.머리.flatMap(덩이로),
    ...(g.케이스 === undefined ? [] : 카드.구획((tcId) => 재료.종류.get(tcId) === g.케이스)),
    ...(g.시나리오 ?? []).flatMap((s) => [...s.머리.flatMap(덩이로), ...시나리오몸(s.doc)]),
  ]);
  return 문서판(리포트제목(r), [
    리포트스타일,
    // 승인 전 버전은 다시 만들 때마다 바뀐다 — 문서 전체에 옅게 깔아 어느 때 것인지 보이게 한다 (§3.17 「묶음 · 버전」)
    ...(r.approval === null ? [`<div class="draft-mark">승인 전</div>`] : []),
    `<header class="doc-head">`,
    `  <div class="service">${안전(리포트제목(r))}</div>`,
    `  <div class="repo">버전 ${r.version} · ${r.approval === null ? '승인 전' : '승인됨'} · ${안전(시각(r.updatedAt))} 기준</div>`,
    `</header>`,
    `<section class="first-page">`,
    ...첫장글(r).flatMap(덩이로),
    `</section>`,
    ...구획,
    ...카드.부록,
  ]);
}
