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

// 방문 기록 칸마다 몇 번째인지 적어 둔다. 막혔을 때 링크로 새 칸이 쌓인 것인지 뒤로 · 앞으로 가기로 옛 칸에 온 것인지 가려야
// 원래 칸으로 돌아갈 수 있다 — 가리지 않고 지금 칸을 이전 주소로 덮으면 같은 주소 칸이 둘이 돼 뒤로 가기를 두 번 눌러야 했다
function 칸번호(): number | null {
  const s: unknown = window.history.state;
  return typeof s === 'object' && s !== null && 'navIndex' in s && typeof s.navIndex === 'number' ? s.navIndex : null;
}

function 칸적기(번호: number): void {
  const s: unknown = window.history.state;
  window.history.replaceState({ ...(typeof s === 'object' && s !== null ? s : {}), navIndex: 번호 }, '');
}

export function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  const 이전 = useRef(window.location.hash);
  useEffect(() => {
    let 지금칸 = 칸번호() ?? 0;
    칸적기(지금칸);
    const onChange = () => {
      const 새것 = window.location.hash;
      if (새것 === 이전.current) return;
      const 온칸 = 칸번호();
      if (막는쪽 !== null && !한번통과) {
        if (온칸 === null) {
          // 새 칸이 쌓였다. 그 칸을 이전 주소로 덮고 한 칸 물러난다 — 같은 주소끼리 옮겨 hashchange 가 다시 나지 않는다
          window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + 이전.current);
          window.history.back();
        } else {
          // 옛 칸으로 왔다. 그 칸은 두고 원래 칸으로 되돌아간다 — 돌아올 때의 hashchange 는 위의 같은 주소 검사가 거른다
          window.history.go(지금칸 - 온칸);
        }
        막는쪽(새것);
        return;
      }
      if (온칸 === null) 칸적기(++지금칸);
      else 지금칸 = 온칸;
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
