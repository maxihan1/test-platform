// 케이스마다 고쳐 넣은 값과 칸 채우기 규칙 — 상세 칸과 실행 창이 같이 쓴다 (SPEC §8.1 · §8.10)
// 줄의 입력 칸은 2026-10-19 ⑫ 시안 A 에서 상세 칸으로 옮겼다. 칸을 그리는 일은 Form 이 한다

import { type Field, initialText } from './schema.js';

/** 케이스마다 고쳐 넣은 글자. 안 고친 칸은 여기 아예 없고 코드의 기본값으로 돈다 (SPEC §8.10) */
export interface 줄글자 {
  params: Record<string, string>;
  expected: Record<string, string>;
}

/** 상세 칸에서는 서버 사유를 안 붙인다 — 그 값은 실행을 거는 쪽이 받는다 */
export const 오류없음: Record<string, string> = {};

/**
 * 고친 값이 있으면 그것을, 없으면 저장값 · 코드 기본값을 보여준다. undefined 를 펴면 아무 일도 안 난다.
 * 상세 칸과 실행 창이 같은 표(`글자`)를 보므로 채우는 규칙도 하나여야 두 자리가 같은 값을 보여준다
 */
export const 채운글자 = (fields: Field[], 고친: Record<string, string> | undefined): Record<string, string> => ({
  ...initialText(fields),
  ...고친,
});
