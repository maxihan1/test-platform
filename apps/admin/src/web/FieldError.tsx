// 칸 아래 사유 한 줄과 「누른 뒤 첫 오류 칸으로」 — 단추를 잠그지 않고 누르면 어느 칸이 왜 걸렸는지 보인다 (DESIGN.md 「폼 자동 생성 규칙」)

import { useEffect, useRef, useState } from 'react';

type 사유꼴 = string | null | undefined;

/** 칸에 펴 넣는다. 칸에 들어서면 틀렸다는 것과 사유를 같이 읽는다 */
export function 오류속성(id: string, 사유: 사유꼴): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
  return 사유 === null || 사유 === undefined ? {} : { 'aria-invalid': true, 'aria-describedby': id };
}

/** 칸이 여럿인 묶음(체크칸 목록 · 표)에 펴 넣는다. 안에 누를 것이 없으면 묶음이 포커스를 받는다 */
export function 오류묶음(id: string, 사유: 사유꼴): { 'data-err'?: ''; 'aria-describedby'?: string; tabIndex?: -1 } {
  return 사유 === null || 사유 === undefined ? {} : { 'data-err': '', 'aria-describedby': id, tabIndex: -1 };
}

/** label 안에 넣지 않는다 — 사유가 칸 이름에 섞인다 */
export function 칸오류({ id, 사유 }: { id: string; 사유: 사유꼴 }) {
  return 사유 === null || 사유 === undefined ? null : (
    <div className="err" id={id} role="alert">
      {사유}
    </div>
  );
}

const 누를것 = ['input', 'select', 'textarea', 'button'].map((it) => `${it}:not([disabled])`).join(', ');

/** `첫오류로()` 를 사유를 적는 것과 같은 손놀림에서 부른다. 사유가 그려진 다음이라야 칸을 찾을 수 있어 포커스는 effect 에서 옮긴다 */
export function use첫오류<T extends HTMLElement = HTMLDivElement>() {
  const 상자 = useRef<T>(null);
  const [차례, set차례] = useState(0);
  useEffect(() => {
    if (차례 === 0) return;
    const 걸린 = 상자.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-err]') ?? null;
    (걸린?.hasAttribute('data-err') === true ? (걸린.querySelector<HTMLElement>(누를것) ?? 걸린) : 걸린)?.focus();
  }, [차례]);
  return { 상자, 첫오류로: () => set차례((n) => n + 1) };
}
