// 부하 일 둘(k6 · 더미 클라이언트)이 같이 쓰는 것 — 허용 호스트 검사와 1초 숫자 보내기 고리 (도메인/성능 §5.4)

import { setTimeout as sleep } from 'node:timers/promises';

import type { Job, LoadSecond } from './types.js';

// 결과는 1초마다 몰아서 쓴다. 2초를 기다려야 그 초의 줄이 다 와 있다 — QA Hub 가 합치기를 기다리는 2초와 같다(§5.4)
export const LAG_SEC = 2;

export interface SecondSource {
  take(sec: number): LoadSecond;
  leftovers(): number[];
}

/** 대상 서버 주소가 허용 호스트 밖이면 막는 이유. 주소가 없으면 검사를 건너뛰지 않고 막는다 — 빈 환경으로 아무 호스트에나 부하를 걸지 않게 */
export function hostProblem(job: Job): string | null {
  const host = (() => {
    try {
      return new URL(job.env.BASE_URL ?? '').host;
    } catch {
      return undefined;
    }
  })();
  return !host || !job.allowedHosts.includes(host) ? `허용 호스트 밖의 대상 서버입니다 — ${host ?? '주소 없음'}` : null;
}

// 끝난 뒤 남은 초를 보내다 실패하면 1초 쉬고 이만큼 더 해 본다 — QA Hub 가 아주 멈췄으면 그만둔다
const FINAL_RETRIES = 5;

/**
 * exited 가 풀릴 때까지 1초마다 LAG_SEC 초 전까지의 숫자를 보내고, 풀리면 남은 초를 다 보낸다. from 부터 보내고 다음에 보낼 초를 돌려준다.
 * send 가 false 면 그 초는 버리고 그 틱의 나머지는 다음 틱으로 미룬다 — QA Hub 가 느릴 때 초마다 10초씩 기다리며 밀리지 않게.
 * 실패한 초를 다시 보내지 않는 것은 QA Hub 가 받고 답만 늦었을 때 두 번 더하지 않으려고다
 */
export async function pumpSeconds(startMs: number, src: SecondSource, exited: Promise<unknown>, send: (s: LoadSecond) => Promise<boolean>, from = 0): Promise<number> {
  let next = from;
  let finished = false;
  void exited.then(() => {
    finished = true;
  });
  // 다 보냈으면 true
  const flush = async (upTo: number): Promise<boolean> => {
    for (const late of src.leftovers().filter((s) => s < next)) if (!(await send(src.take(late)))) return false;
    for (; next <= upTo; next += 1) {
      if (!(await send(src.take(next)))) {
        next += 1;
        return false;
      }
    }
    return true;
  };
  while (!finished) {
    await Promise.race([sleep(1000), exited]);
    await flush(Math.floor((Date.now() - startMs) / 1000) - LAG_SEC);
  }
  // 끝난 뒤에는 남은 초를 다 보낸다. 실패를 미룰 다음 틱이 없어 여기서 다시 해 본다
  const last = Math.max(next - 1, ...src.leftovers());
  for (let i = 0; !(await flush(last)) && i < FINAL_RETRIES; i += 1) await sleep(1000);
  return next;
}
