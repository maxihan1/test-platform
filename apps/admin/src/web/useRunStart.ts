// 실행 창에서 「실행」을 눌렀을 때 실제로 거는 일 — 목록 · 실행 결과 · 항목 상세가 같이 쓴다 (도메인/실행 §8.10)

import { useState } from 'react';

import { api } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 실행제목 } from './pickRun.js';
import type { 실행요청 } from './RunPickModal.js';
import { message } from './ui.js';

/**
 * **칸별 사유를 되돌리지 못한다.** `POST /api/runs` 는 입력값을 명세로 검증하지 않아
 * `violations` 를 아예 내지 않는다 — 어느 케이스의 어느 칸인지를 서버가 말해 주지 않는다.
 * 그래서 지어내지 않고 서버가 준 한 줄을 **창 안으로** 돌려보내고 창은 열어 둔다.
 * 거절당해도 `거는중` 을 반드시 풀어 다시 누를 수 있게 한다.
 */
export function useRunStart() {
  const t = use말();
  const 언어 = use언어();
  // 걸었다 거절당한 사유. **목록 줄에 적으면 창 뒤에 깔린다** — 창 안에 적는다 (SPEC §8.10)
  const [사유, set사유] = useState<string | undefined>(undefined);
  // 두 번 눌러도 실행이 둘 생기지 않게 막는다. 창은 onRun 을 기다리지 않는다.
  // useRef 로 두면 바뀌어도 다시 그리지 않아 최대 1000건을 만드는 동안 화면이 침묵한다
  const [거는중, set거는중] = useState(false);

  /** 걸었으면 참이다 — 부른 쪽이 창을 닫는다 */
  async function 걸기(요청: 실행요청): Promise<boolean> {
    if (거는중) return false;
    set거는중(true);
    set사유(undefined);
    try {
      const { runId } = await api.createRun({ ...요청, title: 요청.title ?? 실행제목(요청.items, t) });
      window.location.hash = `#/runs/${runId}`;
      return true;
    } catch (err) {
      set사유(message(err, 언어));
      return false;
    } finally {
      set거는중(false);
    }
  }

  return { 사유, 거는중, 걸기, 사유지우기: () => set사유(undefined) };
}
