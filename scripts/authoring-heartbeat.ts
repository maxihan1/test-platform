// 한 건 처리 전체(집은 뒤 ~ 끝내기 전)의 30초 신호 — 서버는 stage_at 이 3분 묵으면 에이전트가 죽었다고 본다 (도메인/작성 §7 「중단 · 폐기 · 진척」)
// 자식이 도는 동안만 진척을 싣고, 응답의 stop 으로 자식을 멈춘다. 자식 밖에서 받은 stop 은 띄우기 직전에 부르는 쪽이 본다

import { type 보고손, 도는자식, 멈춤 } from './authoring-io.js';
import { type 진척, 멈추라했나 } from './authoring-progress.js';

export function 박동손(손: 보고손, 간격 = 30_000) {
  let 글: string | null = null;
  let 재기: (() => 진척) | null = null;
  let 멈출: AbortController | null = null;
  let 멈추라 = false;
  let 떠있음: Promise<void> | null = null;

  const 응답보기 = (답: unknown) => {
    if (멈추라했나(답)) 멈추라 = true;
    return 답;
  };

  const 한번 = async (보낼글: string) => {
    try {
      const 답 = 응답보기(await 손.단계(보낼글, 재기?.()));
      const status = (답 as { status?: unknown } | null)?.status;
      if (멈추라했나(답)) 멈출?.abort();
      else if (status === 409) {
        // 누가 행을 이미 닫았다 — 자식이 더 돌아도 받아 줄 곳이 없다
        console.error('[남김] 신호에 서버가 409 를 냈다 — 끝난 행이라 자식을 멈춘다');
        멈출?.abort();
      } else if (status !== 200) console.error(`[남김] 신호에 서버가 ${String(status)} 를 냈다`);
    } catch (err) {
      const 까닭 = err instanceof Error ? err.message : String(err);
      if (까닭.includes('서버가 거절했다')) {
        멈춤.까닭 = 까닭;
        멈출?.abort();
        for (const 자식 of 도는자식) 자식.kill('SIGKILL');
      } else console.error(`[남김] 신호를 못 올렸다: ${까닭}`);
    }
  };

  // 서버가 느리면 틱이 쌓여 같은 신호를 겹쳐 보낸다
  const 틱 = () => {
    // 시계가 꺼졌으면 끝내기를 보냈거나 보내는 중이다
    if (시계 === null || 떠있음 !== null || 글 === null) return;
    떠있음 = 한번(글).finally(() => {
      떠있음 = null;
    });
  };
  let 시계: ReturnType<typeof setInterval> | null = setInterval(틱, 간격);

  const 멈추기 = async () => {
    if (시계 !== null) clearInterval(시계);
    시계 = null;
    await 떠있음;
  };

  const 감싼손: 보고손 = {
    단계: async (새글, 진척) => {
      글 = 새글;
      return 응답보기(await 손.단계(새글, 진척));
    },
    // 끝낸 뒤의 신호는 409 만 받는다 — 떠 있는 것을 기다리고 시계를 먼저 끈다
    끝내기: async (몸) => {
      await 멈추기();
      return 손.끝내기(몸);
    },
  };

  return {
    손: 감싼손,
    /** 마지막 신호 응답에 멈추라는 말이 있었나 — 자식을 띄우기 직전에 본다. 참이면 안 돌렸으니 사용량보고 없이 STOPPED USER */
    멈추라했다: () => 멈추라,
    /** 자식이 도는 동안 진척을 싣는다. 띄운 직후 한 번은 기다리지 않고 곧바로 보낸다 */
    async 자식동안<T>(진척재기: () => 진척, 돌리기: (신호: AbortSignal) => Promise<T>): Promise<T> {
      재기 = 진척재기;
      멈출 = new AbortController();
      try {
        const 돌림 = 돌리기(멈출.signal);
        void (떠있음 ?? Promise.resolve()).then(틱);
        return await 돌림;
      } finally {
        재기 = null;
        멈출 = null;
      }
    },
    멈추기,
  };
}

export type 박동 = ReturnType<typeof 박동손>;
