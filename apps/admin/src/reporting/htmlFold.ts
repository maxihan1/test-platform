// 증적 HTML 의 접힌 줄과 한 건 실행이 덮은 항목의 「원래 결과」 — html.ts 가 300줄을 넘지 않게 뗀 조각

import type { EvidenceItem } from './collect.js';
import { 본문, 항목줄 } from './htmlItem.js';

export type 형식 = 'HTML' | 'PDF';

/** 문서 안 항목 자리 — 번호는 doc.items 안 순번이다. 부록 고리 이름(`i-번호`)이라 같은 모델이면 같은 글자가 나온다 (SPEC §3.3) */
export interface 항목칸 {
  item: EvidenceItem;
  번호: number;
}

/**
 * 접힌 줄 하나. HTML 은 그 자리에서 펼치고, PDF 는 줄이 부록 고리다 — 몸은 부록이 같은 목록으로 그린다.
 * 어느 길이든 모든 항목이 블록으로 문서에 남는다 — 검수처에 내는 서류에서 회차 하나도 빠지면 안 된다 (도메인/리포팅 §8.4)
 */
export function 접힌줄(format: 형식, 줄: string, 고리: string, 몸: () => string[]): string[] {
  if (format === 'HTML') {
    return [`<details class="fold"><summary class="fold-line">${줄}</summary><div class="fold-body">`, ...몸(), `</div></details>`];
  }
  return [`<a class="fold fold-line" href="#${고리}">${줄}<span class="to-app">부록에서 보기</span></a>`];
}

/** PDF 의 API 원문 부록 고리 이름(`t-번호-절차`, 원래 결과는 `t-o번호-절차`). HTML 은 그 자리에서 접으므로 고리가 없다 */
export function 원문고리(format: 형식, 번호: number, 원래 = false): ((seq: number) => string) | undefined {
  return format === 'PDF' ? (seq) => `t-${원래 ? 'o' : ''}${번호}-${seq}` : undefined;
}

/** 덮인 디바이스의 접힌 줄 「원래 결과」 — HTML 은 그 자리 펼침, PDF 는 부록(원래결과부록)이다. 덮이지 않았으면 빈 목록 */
export function 원래결과(k: 항목칸, format: 형식): string[] {
  const 원래 = k.item.rerun?.original;
  if (원래 === undefined) return [];
  return 접힌줄(format, `<span class="tc-name">원래 결과</span>${항목줄(원래)}`, `o-${k.번호}`, () => 본문(원래, 원문고리(format, k.번호, true)));
}

/** PDF 부록 — 원래 결과의 몸. `머리` 는 케이스 머리 조각이다 */
export function 원래결과부록(목록: { 머리: string; k: 항목칸 }[]): string[] {
  const 실을것 = 목록.filter(({ k }) => k.item.rerun !== undefined);
  if (실을것.length === 0) return [];
  return [
    `<section class="appendix">`,
    `<h2 class="sec">부록 — 원래 결과</h2>`,
    ...실을것.flatMap(({ 머리, k }) => {
      const 원래 = k.item.rerun!.original;
      return [
        `<section class="app-case" id="o-${k.번호}">`,
        `  <h3 class="card-head">${머리}</h3>`,
        `  <div class="dev">`,
        `    <div class="dev-head">${항목줄(원래)}</div>`,
        ...본문(원래, 원문고리('PDF', k.번호, true)),
        `  </div>`,
        `</section>`,
      ];
    }),
    `</section>`,
  ];
}
