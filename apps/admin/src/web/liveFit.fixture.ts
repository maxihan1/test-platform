// 장면 그림이 다 떴다고 알리는 검사 도우미 — jsdom 은 그림을 받지 않아 크기를 손으로 주고 load 를 쏜다 (liveFit.ts)

import { fireEvent } from '@testing-library/react';

export function 그림이뜬다(img: Element, 가로: number, 세로: number): void {
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 가로 });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 세로 });
  fireEvent.load(img);
}

/** 그림 틀에 실린 가로 ÷ 세로. 아직 안 실렸으면 null */
export function 틀비율(틀: Element | null): number | null {
  const 값 = (틀 as HTMLElement | null)?.style.getPropertyValue('--ar') ?? '';
  return 값 === '' ? null : Number(값);
}
