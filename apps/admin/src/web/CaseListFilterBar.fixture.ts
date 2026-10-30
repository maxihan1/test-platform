// 케이스 목록 화면 검사가 같이 쓰는 필터 판 조작 — 판을 열고 조건 칩을 누르고 닫는다 (WEB-F7-07)

import { fireEvent, screen, within } from '@testing-library/react';

/** 이름은 「필터」나 「필터 2」다 — 고른 조건 수 배지가 이름에 붙는다 */
export const 필터단추 = () => screen.getByRole('button', { name: /^(필터|Filter)( \d+)?$/ });

export function 판열기(): HTMLElement {
  const 열린 = screen.queryByRole('dialog', { name: /^(필터|Filter)$/ });
  if (열린 !== null) return 열린;
  fireEvent.click(필터단추());
  return screen.getByRole('dialog', { name: /^(필터|Filter)$/ });
}

/** 판의 한 조건 줄. 판이 닫혀 있으면 연다 */
export const 판조건 = (조건: string) => within(판열기()).getByRole('group', { name: 조건 });

/** 판의 조건 칩 하나를 누른다. 판은 열린 채 남는다 — 고르면 바로 적용된다 */
export function 판칩누르기(조건: string, 글: string | RegExp): void {
  fireEvent.click(within(판조건(조건)).getByRole('button', { name: 글 }));
}

export function 판닫기(): void {
  const 열린 = screen.queryByRole('dialog', { name: /^(필터|Filter)$/ });
  if (열린 !== null) fireEvent.keyDown(열린, { key: 'Escape' });
}
