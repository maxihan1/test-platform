// 증적 요약 띠와 그 안의 판정 한 줄 — 미확정도 그대로 세고 「그중 미확정 N건」만 덧붙인다 (도메인/리포팅 · 실행 §3.2)
// 꼬리 글자는 화면(web/unconfirmed.ts 의 그중미확정글)과 같다 — summary.test.ts 가 둘을 맞대 본다.
// 화면 모듈을 가져오지 않는 까닭: 다국어 표·React 가 따라와 서버 쪽 문서 만들기에 쓸데없는 짐이 된다

import type { EvidenceItem } from './collect.js';
import { 다시실행꼬리, 안전 } from './htmlItem.js';

/**
 * `Pass 3 · Fail 1 · Not tested 3 (Blocked 2) · 그중 미확정 2건`.
 * **회차를 접지 않는다** — 항목 한 행이 하나다(실행 화면 `counts` 와 같다). 세 칸은 0 도 적고,
 * Blocked 괄호는 Blocked 가 있을 때만(옛 실행의 증적을 다시 뽑아도 같은 글이다 — 리포팅 §3.3 「테스트 프로시저」), 미확정 꼬리는 미확정이 있을 때만 적는다
 */
export function 판정줄(items: EvidenceItem[]): string {
  const 통과 = items.filter((i) => i.status === 'PASS').length;
  const 실패 = items.filter((i) => i.status === 'FAIL').length;
  // 돌지 못한 항목(NOT_RUN)도 미실행이다 — 증적은 끝난 실행에서만 만든다
  const 미실행 = items.filter((i) => i.status === 'NA' || i.status === 'NOT_RUN').length;
  const 막힘 = items.filter((i) => i.blocked !== undefined).length;
  const 미확정 = items.filter((i) => i.unconfirmed !== null).length;
  const 앞 = `Pass ${통과} · Fail ${실패} · Not tested ${미실행}${막힘 === 0 ? '' : ` (Blocked ${막힘})`}`;
  return 미확정 === 0 ? 앞 : `${앞} · 그중 미확정 ${미확정}건`;
}

/** 요약 띠 — 화면 요약 띠의 숫자와 같다. 통과율은 통과 ÷ 항목 전부, 회차를 접지 않고 미확정도 센다 (실행 §8.3) */
export function 요약(items: EvidenceItem[]): string[] {
  const 전체 = items.length;
  const 통과 = items.filter((i) => i.status === 'PASS').length;
  const 실패 = items.filter((i) => i.status === 'FAIL').length;
  return [
    `<section class="band">`,
    `  <div class="rate"><span class="big">${전체 === 0 ? '—' : `${((통과 / 전체) * 100).toFixed(1)}%`}</span><span class="axis">통과율</span></div>`,
    `  <div class="tally">`,
    `    <span class="${실패 > 0 ? 'verdict v-fail' : 'zero'}">Fail ${실패}건</span>`,
    `    <span>${전체 === 0 ? '항목 없음' : `항목 ${전체}건 중 ${통과}건 Pass`}</span>`,
    `    <span class="axis">${안전(판정줄(items) + 다시실행꼬리(items))}</span>`,
    `  </div>`,
    `</section>`,
  ];
}
