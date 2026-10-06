// 해시 주소 이동을 저장 안 한 조립 화면이 막을 수 있게 하는 useHash 와 창 닫기 막기
// 모듈 상태인 이유 — 해시 이동은 React 바깥 이벤트라, 화면이 내려가기 전에 막으려면 훅 밖에서 막는 쪽을 알아야 한다

import { useEffect, useRef, useState } from 'react';

let 막는쪽: ((갈곳: string) => void) | null = null;
let 한번통과 = false;

export function 떠나기막기(쪽: ((갈곳: string) => void) | null): void {
  막는쪽 = 쪽;
}

export function 떠나기로했다(): void {
  한번통과 = true;
}

export function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  const 이전 = useRef(window.location.hash);
  useEffect(() => {
    const onChange = () => {
      const 새것 = window.location.hash;
      if (새것 === 이전.current) return;
      if (막는쪽 !== null && !한번통과) {
        // 방문 기록을 늘리지 않고 hashchange 도 다시 일으키지 않으려고 주소만 되돌린다
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 이전.current);
        막는쪽(새것);
        return;
      }
      한번통과 = false;
      이전.current = 새것;
      setHash(새것);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function useBeforeUnload(막나: boolean): void {
  useEffect(() => {
    if (!막나) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [막나]);
}
