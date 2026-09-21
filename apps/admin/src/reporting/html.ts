// 표시용 모델을 §8.4 모양의 A4 문서로 그린다. 이 HTML 이 곧 PDF 의 원본이다
// 가공하지 않는다 — 라벨·마스킹·빈 값은 collect.ts 가 이미 끝냈다. 여기서 또 하면 마스킹이 새는 자리가 둘이 된다

import { readFileSync } from 'node:fs';

import type { EvidenceAssertion, EvidenceDocument, EvidenceField, EvidenceItem, EvidenceStep } from './collect.js';

export interface RenderOptions {
  /** 문서 머리말의 「만든 시각」. 렌더 입력으로 받는다 — 함수 안에서 new Date() 를 부르면 재현성이 깨진다 (SPEC §3.3) */
  generatedAt: string;
}

/** 화면 표기는 PC / 모바일이다. desktop / mobile 은 코드 안에서만 쓴다 (SPEC §2 · web/ui.tsx) */
const 디바이스: Record<EvidenceItem['platform'], string> = { desktop: 'PC', mobile: '모바일' };

/** 판정 색은 통과 초록 · 실패 빨강 · 미실행 회색 셋뿐이다 (docs/DESIGN.md 「색은 판정만 갖는다」) */
const 판정색: Record<EvidenceItem['status'], string> = {
  PASS: 'v-pass',
  FAIL: 'v-fail',
  NA: 'v-na',
  NOT_RUN: 'v-na',
};

// NA 와 NOT_RUN 이 같은 낱말인 것은 겹친 것이 아니라 SPEC 이 정한 표기다. 배지는 셋뿐이고
// 「돌다가 판정을 못 냈다」와 「아예 안 돌았다」를 가르는 것은 옆에 붙는 사유 한 문장이다 (SPEC §8.3)
const 판정글자: Record<EvidenceItem['status'], string> = {
  PASS: '통과',
  FAIL: '실패',
  NA: '미실행',
  NOT_RUN: '미실행',
};

// 케이스 이름과 검증 문장은 사람이 적은 글이다. < 나 & 가 그대로 나가면 문서가 깨지거나 값이 조용히 사라진다
function 안전(값: string): string {
  return 값
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function 판정(status: EvidenceItem['status']): string {
  return `<span class="verdict ${판정색[status]}">${판정글자[status]}</span>`;
}

function 소요(durationMs: number | null): string {
  return durationMs === null ? '' : `<span class="ms">(${durationMs}ms)</span>`;
}

function 검증(a: EvidenceAssertion): string {
  // 한 문장 = 한 줄이다. 기대·실제·판정이 줄을 넘어가면 훑을 수 없다 (SPEC §8.4)
  const 중단 = a.blocker ? '<span class="blocker">실행 중단</span>' : '';
  return `      <div class="assert ${판정색[a.status]}"><span class="mark">${a.status === 'PASS' ? '✓' : '✗'}</span><span class="stmt">${안전(a.statement)}</span><span class="exp">기대 ${안전(a.expected)}</span><span class="act">실제 ${안전(a.actual)}</span>${판정(a.status)}${중단}</div>`;
}

function 스텝(s: EvidenceStep): string[] {
  const 줄들 = s.assertions.map(검증);

  if (s.screenshotPath !== null) {
    // 어느 확인에서 깨졌는지와 그때 화면이 나란히 붙어야 의미가 있다. 스텝 헤더 아래가 아니다 (SPEC §8.4)
    const 깨진곳 = s.assertions.findIndex((a) => a.status === 'FAIL');
    const 자리 = 깨진곳 === -1 ? 줄들.length : 깨진곳 + 1;
    줄들.splice(자리, 0, `      <img class="shot" src="${안전(s.screenshotPath)}" alt="${안전(s.title)} 화면">`);
  }

  return [
    `    <div class="step">`,
    `      <div class="step-head"><span class="seq">${s.seq}.</span><span class="step-title">${안전(s.title)}</span>${판정(s.status)}${소요(s.durationMs)}</div>`,
    ...줄들,
    `    </div>`,
  ];
}

function 필드행(라벨: string, 칸: EvidenceField[], 빈말: string): string[] {
  const 값 =
    칸.length === 0
      ? `      <div class="none">${빈말}</div>`
      : 칸
          .map(
            (f) =>
              `      <div class="field"><span class="f-label">${안전(f.label)}</span><span class="f-value">${안전(f.value)}</span></div>`,
          )
          .join('\n');

  return [`    <div class="row">`, `      <div class="row-k">${라벨}</div>`, `      <div class="row-v">`, 값, `      </div>`, `    </div>`];
}

function 블록(item: EvidenceItem): string[] {
  const 사전 =
    item.precondition.length === 0
      ? [`      <div class="none">사전조건 없음</div>`]
      : item.precondition.map((p) => `      <div class="pre">· ${안전(p)}</div>`);

  // 배지 옆에 붙인다. 떨어뜨리면 러너 고장과 사람이 멈춘 것을 구분할 수 없다 (SPEC §8.3)
  const 사유 =
    item.notRunReason === null ? '' : `<span class="not-run">${안전(item.notRunReason)}</span>`;

  const 절차 =
    item.steps.length === 0
      ? []
      : [`    <div class="row">`, `      <div class="row-k">시험 절차</div>`, `      <div class="row-v">`, ...item.steps.flatMap(스텝), `      </div>`, `    </div>`];

  return [
    `<section class="item">`,
    `    <h2 class="item-head"><span class="tc-id">${안전(item.tcId)}</span><span class="tc-name">${안전(item.tcName)}</span><span class="badge">${디바이스[item.platform]}</span><span class="badge">${item.attempt}회차</span>${판정(item.status)}${소요(item.durationMs)}${사유}</h2>`,
    `    <div class="row">`,
    `      <div class="row-k">사전조건</div>`,
    `      <div class="row-v">`,
    ...사전,
    `      </div>`,
    `    </div>`,
    ...필드행('입력', item.params, '입력 없음'),
    ...필드행('기대 결과', item.expected, '기대 결과 없음'),
    ...절차,
    `</section>`,
  ];
}

// 글꼴을 바깥에서 받아 오지 않는다. 네트워크가 없는 컨테이너에서 PDF 를 찍으므로 웹폰트 링크는 조용히 깨진다.
// 이름만 부르는 것으로는 모자란다 — admin 이미지(playwright:v1.63.0-jammy)에 한글 글꼴이 WenQuanYi(중국어) 뿐이라
// 폴백 스택이 거기까지 떨어져 글자 모양과 줄바꿈이 통째로 달라진다. 파일을 문서 안에 담아야 한다 (SPEC §9.1 · DESIGN.md)
//
// 화면(WS-E)의 파일을 그대로 읽는다. 옮기면 styles.css 와 vite 빌드까지 건드려야 하고,
// DESIGN.md 가 제품 전체에 글꼴 하나를 정해 둔 이상 화면과 문서는 같은 파일을 봐야 맞다.
// 경로가 갈리거나 파일이 잘리면 html.test.ts 의 바이트 수 검사가 빨개진다
//
// 모듈 로드 때 한 번만 읽는다. renderHtml 은 동기이고, 비동기로 바꾸면 generate.ts 까지 번진다
function 담는다(이름: string): string {
  return readFileSync(new URL(`../web/fonts/${이름}`, import.meta.url)).toString('base64');
}

// 본문 둘(400·600)과 등폭 둘(400·500). 가변 글꼴이 아니라 굵기마다 파일이 따로다 —
// 그래서 굵기를 넷으로 늘리지 않는다. 벌이 늘면 증적 문서가 그대로 무거워진다 (html.test.ts 의 4MB 상한)
const 본문400 = 담는다('IBMPlexSansKR-Regular.woff2');
const 본문600 = 담는다('IBMPlexSansKR-SemiBold.woff2');
const 등폭400 = 담는다('IBMPlexMono-Regular.woff2');
const 등폭500 = 담는다('IBMPlexMono-Medium.woff2');

const 스타일 = `
@page { size: A4; margin: 14mm 12mm; }
@font-face{
  font-family:"IBM Plex Sans KR";
  font-weight:400;
  font-style:normal;
  src:url(data:font/woff2;base64,${본문400}) format('woff2');
}
@font-face{
  font-family:"IBM Plex Sans KR";
  font-weight:600;
  font-style:normal;
  src:url(data:font/woff2;base64,${본문600}) format('woff2');
}
@font-face{
  font-family:"IBM Plex Mono";
  font-weight:400;
  font-style:normal;
  src:url(data:font/woff2;base64,${등폭400}) format('woff2');
}
@font-face{
  font-family:"IBM Plex Mono";
  font-weight:500;
  font-style:normal;
  src:url(data:font/woff2;base64,${등폭500}) format('woff2');
}
/* 화면(web/styles.css)과 같은 값이어야 한다. 화면을 보던 사람이 문서를 받았을 때
   다시 배울 것이 없어야 한다는 것이 DESIGN.md 의 전제다. 2026-09-21 「제도 청사진」 */
:root{
  --paper:#F2EFE7; --sheet:#FFFDF9; --ink:#191713; --ink-muted:#524F47; --ink-faint:#6A675E;
  --rule:#E5E1D6; --rule-soft:#F0EDE5; --chrome:#9E4A27; --chip:#F1EEE5;
  --pass:#2E6B4F; --pass-bg:#E3EDE6; --fail:#9B2418; --fail-bg:#F6E4DF; --na:#7A6535; --na-bg:#F0EAD8;
}
*{ box-sizing:border-box; margin:0; padding:0; }
body{
  background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans KR","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;
  font-variant-numeric:tabular-nums; font-size:13.5px; line-height:1.6;
}
.doc{ width:186mm; margin:0 auto; background:var(--sheet); padding:14mm 12mm; }
.doc-head{ border-bottom:2px solid var(--rule); padding-bottom:12px; margin-bottom:20px; }
.service{ font-size:19px; font-weight:600; }
.repo{ font-size:12.5px; color:var(--ink-muted); margin-top:2px; }
.meta{ display:grid; grid-template-columns:96px 1fr 96px 1fr; gap:4px 8px; margin-top:12px; font-size:12.5px; }
.meta dt{ color:var(--ink-faint); font-weight:600; }
.meta dd{ color:var(--ink); }
.item{ border-top:1px solid var(--rule); padding:14px 0; break-inside:avoid; }
.item-head{ font-size:14.5px; font-weight:600; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
/* TC ID·소요시간·회차는 등폭으로 그린다. 화면과 같은 규칙이다 (DESIGN.md 원칙 3) */
.tc-id,.ms,.seq{ font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace; }
.tc-id{ font-size:12.5px; font-weight:500; color:var(--ink-muted); }
.tc-name{ flex:1; }
.badge{ font-size:12px; font-weight:600; color:var(--ink-muted); border:1px solid var(--rule); border-radius:2px; padding:1px 6px; }
.verdict{ font-size:12px; font-weight:600; border-radius:2px; padding:1px 7px; }
.v-pass{ background:var(--pass-bg); color:var(--pass); }
.v-fail{ background:var(--fail); color:#fff; }
.v-na{ background:var(--na-bg); color:var(--na); }
.ms{ font-size:12px; color:var(--ink-faint); }
.row{ display:flex; gap:12px; margin-top:10px; }
.row-k{ width:72px; flex:none; font-size:12px; font-weight:600; color:var(--ink-faint); padding-top:2px; }
.row-v{ flex:1; min-width:0; }
.field{ display:flex; gap:8px; }
.f-label{ width:132px; flex:none; color:var(--ink-muted); }
.f-value{ flex:1; word-break:break-all; }
.none{ color:var(--ink-faint); }
.not-run{ font-size:12px; font-weight:600; color:var(--na); }
.step{ margin-bottom:8px; break-inside:avoid; }
.step-head{ display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--rule-soft); padding-bottom:3px; }
.seq{ width:18px; flex:none; color:var(--ink-faint); font-size:12px; font-weight:600; }
.step-title{ flex:1; }
.assert{ display:flex; align-items:baseline; gap:8px; padding:2px 6px 2px 26px; background:none; }
.assert.v-fail{ background:var(--fail-bg); color:var(--ink); }
.mark{ width:10px; flex:none; font-weight:600; }
.assert.v-pass .mark{ color:var(--pass); }
.assert.v-fail .mark{ color:var(--fail); }
.stmt{ flex:1; }
.exp,.act{ width:132px; flex:none; color:var(--ink-muted); font-size:12.5px; }
.blocker{ font-size:12px; font-weight:600; color:var(--fail); }
.shot{ display:block; max-width:120mm; margin:6px 0 8px 26px; border:1px solid var(--rule); }
@media print{
  body{ background:#fff; }
  .doc{ width:auto; margin:0; padding:0; background:#fff; }
  .item,.step,.shot{ break-inside:avoid; }
}
`;

export function renderHtml(doc: EvidenceDocument, options: RenderOptions): string {
  const h = doc.header;

  return [
    `<!doctype html>`,
    `<html lang="ko">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<title>${안전(h.serviceName)} 증적 문서 — RUN ${doc.runId}</title>`,
    `<style>${스타일}</style>`,
    `</head>`,
    `<body>`,
    `<div class="doc">`,
    `<header class="doc-head">`,
    `  <div class="service">${안전(h.serviceName)}</div>`,
    `  <div class="repo">${안전(h.testsRepo)}</div>`,
    `  <dl class="meta">`,
    `    <dt>실행 제목</dt><dd>${안전(h.title)}</dd>`,
    `    <dt>실행 시각</dt><dd>${안전(h.startedAt)}</dd>`,
    `    <dt>실행자</dt><dd>${안전(h.triggeredByName)}</dd>`,
    `    <dt>대상 서버</dt><dd>${안전(h.env)}</dd>`,
    `    <dt>대상 주소</dt><dd>${안전(h.baseUrl)}</dd>`,
    `    <dt>만든 시각</dt><dd>${안전(options.generatedAt)}</dd>`,
    `  </dl>`,
    `</header>`,
    ...doc.items.flatMap(블록),
    `</div>`,
    `</body>`,
    `</html>`,
  ].join('\n');
}
