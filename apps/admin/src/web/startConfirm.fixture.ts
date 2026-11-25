// 시작 확인 상자와 되돌리기 어려운 동작의 확인 상자를 찾고 누르는 검사 도우미 (검사 전용)

import { fireEvent, screen, within } from '@testing-library/react';

export const 확인상자 = () => screen.getByRole('dialog', { name: /시작할까요\?$/ });
export const 확인상자있나 = () => screen.queryByRole('dialog', { name: /시작할까요\?$/ }) !== null;

/** 이름표 → 값 */
export function 확인줄들(): Record<string, string> {
  const 이름들 = [...확인상자().querySelectorAll('dt')].map((x) => x.textContent ?? '');
  const 값들 = [...확인상자().querySelectorAll('dd')].map((x) => x.textContent ?? '');
  return Object.fromEntries(이름들.map((이름, i) => [이름, 값들[i] ?? '']));
}

export const 확인취소 = () => fireEvent.click(within(확인상자()).getByRole('button', { name: '취소' }));
/** 맨 뒤 단추가 시작이다 */
export const 확인시작 = () => fireEvent.click(within(확인상자()).getAllByRole('button').at(-1)!);

/** 되돌리기 어려운 동작 확인 상자(ConfirmBox.tsx)의 단추를 누른다. E2E 마법사처럼 화면 자체가 대화 상자면 맨 나중 것이다 */
export const 물음누름 = (이름: string) => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)!).getByRole('button', { name: 이름 }));
