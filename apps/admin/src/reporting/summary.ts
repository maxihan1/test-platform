// 증적 머리의 판정 한 줄 — 미확정도 그대로 세고 「그중 미확정 N건」만 덧붙인다 (도메인/리포팅 · 실행 §3.2)
// 꼬리 글자는 화면(web/unconfirmed.ts 의 그중미확정글)과 같다 — summary.test.ts 가 둘을 맞대 본다.
// 화면 모듈을 가져오지 않는 까닭: 다국어 표·React 가 따라와 서버 쪽 문서 만들기에 쓸데없는 짐이 된다

import type { EvidenceItem } from './collect.js';

/**
 * `통과 3 · 실패 1 · 미실행 0 · 그중 미확정 2건`.
 * **회차를 접지 않는다** — 항목 한 행이 하나다(실행 화면 `counts` 와 같다). 세 칸은 0 도 적고,
 * 미확정 꼬리는 미확정이 있을 때만 적는다
 */
export function 판정줄(items: EvidenceItem[]): string {
  const 통과 = items.filter((i) => i.status === 'PASS').length;
  const 실패 = items.filter((i) => i.status === 'FAIL').length;
  // 돌지 못한 항목(NOT_RUN)도 미실행이다 — 증적은 끝난 실행에서만 만든다
  const 미실행 = items.filter((i) => i.status === 'NA' || i.status === 'NOT_RUN').length;
  const 미확정 = items.filter((i) => i.unconfirmed !== null).length;
  const 앞 = `통과 ${통과} · 실패 ${실패} · 미실행 ${미실행}`;
  return 미확정 === 0 ? 앞 : `${앞} · 그중 미확정 ${미확정}건`;
}
