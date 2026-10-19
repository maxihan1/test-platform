// 시나리오 단계 설정에서 비워 둔 입력값 칸이 실제로 쓸 저장값 — 케이스마다 한 번만 받는다

import { useEffect, useRef, useState } from 'react';

import { api, type SavedInput } from './api.js';

/** 케이스의 저장값. 아직 받는 중이거나 못 받았으면 null — 칸은 옛 글(저장값 사용) 그대로다 */
export function useSavedInput(tcId: string): SavedInput | null {
  const 받음 = useRef(new Map<string, SavedInput | null>());
  const [, set버전] = useState(0);

  useEffect(() => {
    if (받음.current.has(tcId)) return;
    let 취소 = false;
    void (async () => {
      let 값: SavedInput | null = null;
      try {
        값 = (await api.caseOf(tcId)).savedInput ?? null;
      } catch {
        // 흐린 안내글은 거들기라 케이스를 못 받아도(404 · 오류) 칸은 쓸 수 있다 — 안내만 옛 글로 둔다
      }
      if (취소) return;
      받음.current.set(tcId, 값);
      set버전((n) => n + 1);
    })();
    return () => {
      취소 = true;
    };
  }, [tcId]);

  return 받음.current.get(tcId) ?? null;
}
