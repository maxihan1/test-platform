// 화면 전체를 덮는 마법사의 키보드 — Esc 는 나가기, Tab 은 마법사 안에서만 돈다 (도메인/인증 §8.8 · 도메인/시나리오 §8.11 「마법사」)

import { useEffect, type RefObject } from 'react';

import { 상자열렸나, 포커스가능 } from './Modal.js';

/**
 * 뒤 화면(메뉴 · 머리)으로 키보드가 새지 않게 가둔다. 떠나기 확인 상자가 떠 있으면 그 상자가 Esc · Tab 을 맡는다
 * @param 나가는곳 Esc 로 옮길 주소
 */
export function useWizardKeys(틀: RefObject<HTMLElement | null>, 나가는곳: string): void {
  useEffect(() => {
    function 눌림(e: KeyboardEvent) {
      if (상자열렸나()) return;
      if (e.key === 'Escape') {
        window.location.hash = 나가는곳;
        return;
      }
      if (e.key !== 'Tab') return;
      const 것들 = [...(틀.current?.querySelectorAll<HTMLElement>(포커스가능) ?? [])];
      const 처음 = 것들[0];
      const 끝 = 것들[것들.length - 1];
      if (처음 === undefined || 끝 === undefined) return;
      if (!e.shiftKey && document.activeElement === 끝) {
        e.preventDefault();
        처음.focus();
      } else if (e.shiftKey && document.activeElement === 처음) {
        e.preventDefault();
        끝.focus();
      }
    }
    document.addEventListener('keydown', 눌림);
    return () => document.removeEventListener('keydown', 눌림);
  }, [틀, 나가는곳]);
}
