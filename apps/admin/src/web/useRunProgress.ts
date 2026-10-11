// 도는 실행의 러너 진행 목록과 남은 시간을 2초마다 묻는 훅 (SPEC §7)

import { useEffect, useState } from 'react';

import { api, type 항목진행 } from './api.js';

interface 진행답 {
  진행목록: 항목진행[];
  /** 서버가 잰 남은 시간. 아직 모르면 null */
  남은ms: number | null;
}

const 없음: 진행답 = { 진행목록: [], 남은ms: null };

// 그리는 값이라 `useState` 다. `useRef` 로 들면 값은 맞는데 화면이 다시 안 그려진다
// — 2026-09-21 에 이 화면 바로 옆에서 난 사고다
export function useRunProgress(running: boolean, runId: number): 진행답 {
  const [답, set답] = useState<진행답>(없음);

  // 러너의 「지금」은 DB 에 없다. 상세 조회와 별개의 통로라 같은 2초 주기로 따로 묻는다 (SPEC §7).
  // **도는 중일 때만 부른다** — 끝난 실행을 열 때마다 러너를 깨울 이유가 없다
  useEffect(() => {
    if (!running) return;
    const 묻는다 = () => {
      void api
        .progress(runId)
        .then((온것) => set답({ 진행목록: 온것.items, 남은ms: 온것.remainingMs }))
        // 진행은 곁들이다. 러너에 못 닿아도 결과 화면은 그대로 서 있어야 해서 절차를 지우고
        // 이름까지만 아는 상태로 물러선다 — `진행상황()` 이 빈 목록을 그 뜻으로 받는다
        .catch(() => set답(없음));
    };
    묻는다();
    const timer = setInterval(묻는다, 2000);
    return () => clearInterval(timer);
  }, [running, runId]);

  return 답;
}
