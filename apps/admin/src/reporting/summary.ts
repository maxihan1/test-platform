// 증적 머리의 판정 한 줄 — 확정만 세고 미확정은 따로 묶는다 (도메인/리포팅 「미확정 항목은 따로 묶는다」 · 실행 §3.2)
// 묶음 글자 꼴은 화면(web/unconfirmed.ts 의 미확정글자)과 같다 — summary.test.ts 가 둘을 맞대 본다.
// 화면 모듈을 가져오지 않는 까닭: 다국어 표·React 가 따라와 서버 쪽 문서 만들기에 쓸데없는 짐이 된다

import type { EvidenceItem } from './collect.js';

interface 셈 {
  통과: number;
  실패: number;
  미실행: number;
}

function 세기(들: EvidenceItem[]): 셈 {
  return {
    통과: 들.filter((i) => i.status === 'PASS').length,
    실패: 들.filter((i) => i.status === 'FAIL').length,
    // 돌지 못한 항목(NOT_RUN)도 미실행이다 — 증적은 끝난 실행에서만 만든다
    미실행: 들.filter((i) => i.status === 'NA' || i.status === 'NOT_RUN').length,
  };
}

/**
 * `통과 3 · 실패 1 · 미실행 0 · 미확정 2(통과 1 · 실패 1)`.
 * **회차를 접지 않는다** — 항목 한 행이 하나다(실행 화면 `counts` 와 같다). 확정 칸은 0 도 적고,
 * 미확정 묶음은 있을 때만 적고 그 안의 0 칸은 뺀다
 */
export function 판정줄(items: EvidenceItem[]): string {
  const 확정 = 세기(items.filter((i) => i.unconfirmed === null));
  const 미확정들 = items.filter((i) => i.unconfirmed !== null);
  const 앞 = `통과 ${확정.통과} · 실패 ${확정.실패} · 미실행 ${확정.미실행}`;
  if (미확정들.length === 0) return 앞;
  const u = 세기(미확정들);
  const 칸 = [
    u.통과 > 0 ? `통과 ${u.통과}` : '',
    u.실패 > 0 ? `실패 ${u.실패}` : '',
    u.미실행 > 0 ? `미실행 ${u.미실행}` : '',
  ].filter((글) => 글 !== '');
  return `${앞} · 미확정 ${미확정들.length}(${칸.join(' · ')})`;
}
