// 증적 문서(HTML · PDF)에 심는 글꼴과 종이용 CSS — html.ts 가 문서 머리에 그대로 붙인다

import { readFileSync } from 'node:fs';

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

export const 증적스타일 = `
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
/* 요약 띠는 판, 카드는 테두리 면, 줄 목록은 선이다 — 화면과 같은 배치를 종이 색으로 찍는다 (DESIGN.md 「실행 결과」) */
.band{ display:flex; align-items:center; gap:24px; background:var(--chip); border-radius:4px; padding:12px 16px; }
.rate{ display:flex; flex-direction:column; }
.big{ font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace; font-size:28px; font-weight:500; line-height:1.2; }
.axis{ font-size:12px; color:var(--ink-muted); }
.tally{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.zero{ font-size:12px; font-weight:600; color:var(--ink-muted); }
.sec{ font-size:15px; font-weight:600; margin:24px 0 10px; }
.card{ border:1px solid var(--rule); border-left:3px solid var(--fail); border-radius:4px; padding:12px 14px; margin-bottom:14px; }
.card-head{ font-size:14.5px; font-weight:600; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.dev{ margin-top:12px; }
.dev-head{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.tries{ font-size:12px; font-weight:600; color:var(--fail); }
/* 접힌 줄 — HTML 은 details 로 그 자리에서 펼치고 PDF 는 같은 줄이 부록으로 가는 고리다. 표시는 그려서 낸다(글꼴에 없는 글자를 안 쓴다) */
.fold{ display:block; border-top:1px solid var(--rule-soft); }
.fold-line{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:6px 0; color:var(--ink); text-decoration:none; cursor:pointer; list-style:none; }
.fold-line::-webkit-details-marker{ display:none; }
.fold-line::before{ content:""; flex:none; border-left:5px solid var(--ink-faint); border-top:4px solid transparent; border-bottom:4px solid transparent; }
details[open] > .fold-line::before{ transform:rotate(90deg); }
.fold-body{ padding:0 0 10px 13px; }
.devs{ font-size:12.5px; color:var(--ink-muted); }
/* 미확정 사유는 길어서 줄 맨 아래 한 줄로 내린다 — 같은 줄에 두면 케이스 이름이 접힌다. 「부록」 글자는 첫 줄에 남는다 */
.fold-line .u-reason{ order:1; flex-basis:100%; margin:0 0 0 13px; }
.to-app{ margin-left:auto; font-size:12px; color:var(--ink-faint); }
.appendix{ break-before:page; }
.app-case{ border-top:1px solid var(--rule); padding:12px 0; }
/* TC ID·소요시간·회차는 등폭으로 그린다. 화면과 같은 규칙이다 (DESIGN.md 원칙 3) */
.tc-id,.ms,.seq{ font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace; }
.tc-id{ font-size:12.5px; font-weight:500; color:var(--ink-muted); }
.tc-name{ flex:1; }
.badge{ font-size:12px; font-weight:600; color:var(--ink-muted); border:1px solid var(--rule); border-radius:2px; padding:1px 6px; }
/* 「통과」와 「미실행」의 폭을 맞춘다 — 줄 · 머리가 배지로 시작해서 폭이 다르면 바로 뒤 TC ID 가 세로로 안 맞는다 (DESIGN.md 원칙 3) */
.verdict{ font-size:12px; font-weight:600; border-radius:2px; padding:1px 7px; min-width:52px; text-align:center; }
.v-pass{ background:var(--pass-bg); color:var(--pass); }
.v-fail{ background:var(--fail); color:#fff; }
.v-na{ background:var(--na-bg); color:var(--na); }
.ms{ font-size:12px; color:var(--ink-faint); }
.u-reason{ margin-top:4px; font-size:12.5px; color:var(--ink-muted); }
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
/* API 항목의 응답 형식 검사와 요청 · 응답 원문 — 확인 문장과 같은 들여쓰기에 따로 둔다. 판정 배경을 안 깐다 (도메인/API §3.8) */
.shape-label{ margin:4px 0 0 26px; font-size:12px; font-weight:600; color:var(--ink-faint); }
.shape-row{ display:flex; align-items:baseline; gap:8px; padding:2px 6px 2px 26px; }
.shape-ok .mark{ color:var(--pass); }
.shape-bad .mark{ color:var(--fail); }
.shape-none{ color:var(--ink-muted); padding-left:44px; }
.shape-problem{ padding-left:44px; font-size:12.5px; color:var(--ink-muted); }
.trace-fold{ margin:4px 0 0 26px; }
.trace-line{ display:flex; gap:8px; font-size:12.5px; color:var(--ink-muted); text-decoration:none; cursor:pointer; margin:4px 0 0 26px; }
.trace-fold > .trace-line{ margin:0; }
.trace-k{ margin-top:6px; font-size:12px; font-weight:600; color:var(--ink-faint); }
.trace{ margin:2px 0 0; padding:6px 8px; border:1px solid var(--rule-soft); font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11.5px; white-space:pre-wrap; word-break:break-all; }
.app-trace{ border-top:1px solid var(--rule); padding:12px 0; }
.shot{ display:block; max-width:120mm; margin:6px 0 8px 26px; border:1px solid var(--rule); }
/* E2E 증적의 단계 — 판정이 아니라 차례라 테두리에 판정 색을 안 쓴다. 모킹 구간은 왼쪽 굵은 중립 선이다 (도메인/시나리오 §8.11) */
.stage{ border:1px solid var(--rule); border-radius:4px; padding:10px 14px; margin-bottom:10px; }
.stage.mocked{ border-left:3px solid var(--ink-faint); }
.note{ margin-top:4px; font-size:12.5px; color:var(--ink-muted); }
@media print{
  body{ background:#fff; }
  .doc{ width:auto; margin:0; padding:0; background:#fff; }
  /* 카드는 한 쪽을 넘을 수 있어 통째로 묶지 않는다. 머리가 쪽 끝에 홀로 남지 않게만 한다 */
  .step,.shot,.fold-line,.band{ break-inside:avoid; }
  .card-head,.dev-head,.sec{ break-after:avoid; }
}
`;
