// 실행 창에서 「실행」을 눌렀을 때 실제로 거는 일 — 목록 · 실행 결과 · 항목 상세가 같이 쓴다 (도메인/실행 §8.10)

import { useState } from 'react';

import { api } from './api.js';
import { use언어 } from './i18n.js';
import { 실행기록주소 } from './route.js';
import type { 실행요청 } from './pickRun.js';
import { 지켜본다 } from './runWatchStore.js';
import { message } from './ui.js';

/**
 * 서버가 한 건 실행(SINGLE)으로 만들었나. 붙은 곳이 있으면 한 건이다. 없으면 케이스 하나 · 반복 1 일 때만 실행을 읽어 본다 —
 * 원래 실행이 반복 실행인 「실패 1건 다시 실행」은 새 RUN(RERUN)이라 화면이 규칙만으로는 못 가른다 (도메인/실행 §3.2)
 */
async function 한건이었나(요청: 실행요청, runId: number, attachedTo: number | null | undefined): Promise<boolean> {
  if (attachedTo != null) return true;
  if (new Set(요청.items.map((it) => it.tcId)).size !== 1 || 요청.repeat !== 1) return false;
  // 못 읽으면 실행 기록으로 옮긴다 — 앞 판의 길이다
  return api.run(runId).then((r) => r.origin === 'SINGLE', () => false);
}

/**
 * **칸별 사유를 되돌리지 못한다.** `POST /api/runs` 는 입력값을 명세로 검증하지 않아
 * `violations` 를 아예 내지 않는다 — 어느 케이스의 어느 칸인지를 서버가 말해 주지 않는다.
 * 그래서 지어내지 않고 서버가 준 한 줄을 **창 안으로** 돌려보내고 창은 열어 둔다.
 * 거절당해도 `거는중` 을 반드시 풀어 다시 누를 수 있게 한다.
 */
/**
 * @param on걸었다 있으면 주소를 옮기지 않고 새 실행 번호를 넘긴다 — 실행 기록의 결과 칸에서 건 「실패 다시」는
 * 같은 목록에 남아 그 실행만 고른다(주소를 옮기면 목록이 조건을 다시 그려 고른 것을 덮는다)
 */
export function useRunStart(on걸었다?: (runId: number) => void) {
  const 언어 = use언어();
  // 걸었다 거절당한 사유. **목록 줄에 적으면 창 뒤에 깔린다** — 창 안에 적는다 (SPEC §8.10)
  const [사유, set사유] = useState<string | undefined>(undefined);
  // 두 번 눌러도 실행이 둘 생기지 않게 막는다. 창은 onRun 을 기다리지 않는다.
  // useRef 로 두면 바뀌어도 다시 그리지 않아 최대 5000건을 만드는 동안 화면이 침묵한다
  const [거는중, set거는중] = useState(false);

  /** 걸었으면 참이다 — 부른 쪽이 창을 닫는다 */
  async function 걸기(요청: 실행요청 & { rerunOf?: number }): Promise<boolean> {
    if (거는중) return false;
    set거는중(true);
    set사유(undefined);
    try {
      // 제목은 서버가 짓는다 (도메인/실행 §7 「자동 제목」)
      const { runId, attachedTo } = await api.createRun(요청);
      // 한 건은 실행 기록에 줄로 서지 않는다 — 옮기지 않고 그 자리에서 진행 창을 연다. 끝을 알리는 것은 이 창뿐이다 (도메인/실행 §3.2 · §8.9)
      if (await 한건이었나(요청, runId, attachedTo)) {
        지켜본다({ runId, 열림: true });
        return true;
      }
      // 결과 화면 대신 실행 기록에서 그 실행을 고른 채 연다 — 뒤로 가면 떠난 목록의 조건이 그대로다 (도메인/실행 §8.7 「A안」)
      if (on걸었다 !== undefined) on걸었다(runId);
      else window.location.hash = 실행기록주소(요청.items[0]?.tcId ?? '', runId);
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
