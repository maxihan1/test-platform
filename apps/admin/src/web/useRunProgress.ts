// 도는 실행의 러너 진행 목록을 2초마다 묻는 훅 (SPEC §7)

import { useEffect, useState } from 'react';

import { api, type 항목진행 } from './api.js';

// 그리는 값이라 `useState` 다. `useRef` 로 들면 값은 맞는데 화면이 다시 안 그려진다
// — 2026-09-21 에 이 화면 바로 옆에서 난 사고다
export function useRunProgress(running: boolean, runId: number): 항목진행[] {
  const [진행목록, set진행목록] = useState<항목진행[]>([]);

  // 러너의 「지금」은 DB 에 없다. 상세 조회와 별개의 통로라 같은 2초 주기로 따로 묻는다 (SPEC §7).
  // **도는 중일 때만 부른다** — 끝난 실행을 열 때마다 러너를 깨울 이유가 없다
  useEffect(() => {
    if (!running) return;
    const 묻는다 = () => {
      void api
        .progress(runId)
        .then((답) => set진행목록(답.items))
        // 진행은 곁들이다. 러너에 못 닿아도 결과 화면은 그대로 서 있어야 해서 절차를 지우고
        // 이름까지만 아는 상태로 물러선다 — `진행상황()` 이 빈 목록을 그 뜻으로 받는다
        .catch(() => set진행목록([]));
    };
    묻는다();
    const timer = setInterval(묻는다, 2000);
    return () => clearInterval(timer);
  }, [running, runId]);

  return 진행목록;
}
