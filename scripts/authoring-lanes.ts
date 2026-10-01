// 동시 실행 도구 — 반영은 서비스마다 한 줄 · 뒤에서 도는 일 · 자리 놓을지 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」 「동시 실행」)
// 판단만 든다. 집기 · 자리 잡기 · 처리는 authoring-agent 가 이것으로 엮는다

import { 보류있나 } from './authoring-held-apply.js';

/**
 * 같은 서비스의 반영은 모두 차례로 돈다 — main 에 차례로 들어가야 겹침 견주기가 맞다(main 보호가 최신 main 위의 CI 를 강제하지 않는다).
 * 앞 반영을 기다리는 동안 `알림` 을 간격마다 다시 보낸다 — 안 보내면 단계 글 없이 30분이 지나 화면이 「응답 없음」으로 그린다
 */
export function 반영줄들(알림간격 = 60_000, 멈췄나: () => boolean = () => false) {
  const 꼬리 = new Map<string, Promise<unknown>>();
  return {
    걸기<T>(서비스: string, 알림: () => Promise<unknown>, 일: () => Promise<T>): Promise<T | undefined> {
      const 앞 = 꼬리.get(서비스) ?? Promise.resolve();
      const 이번 = (async (): Promise<T | undefined> => {
        const 보내기 = () => void 알림().catch(() => undefined);
        보내기();
        const 시계 = setInterval(보내기, 알림간격);
        try {
          await 앞;
        } finally {
          clearInterval(시계);
        }
        // 서버가 거절해 멈추는 중이면 줄에 서 있던 반영도 시작하지 않는다 — 시작하면 올려 놓고 끝내기가 안 받아져 행이 RUNNING 으로 남는다
        return 멈췄나() ? undefined : 일();
      })();
      // 앞이 던져도 다음 반영은 돈다
      꼬리.set(서비스, 이번.catch(() => undefined));
      return 이번;
    },
  };
}

/** 뒤에서 도는 일 모음 — 끝낼 때 다 기다리고, 던진 오류는 `오류처리` 가 받는다(「서버가 거절했다」면 모두 멈춘다) */
export function 도는일들(오류처리: (e: unknown) => void) {
  const 도는것 = new Set<Promise<unknown>>();
  return {
    더하기(일: Promise<unknown>): void {
      const 감싼 = 일.catch(오류처리).finally(() => 도는것.delete(감싼));
      도는것.add(감싼);
    },
    수: () => 도는것.size,
    async 다기다리기(): Promise<void> {
      while (도는것.size > 0) await Promise.all([...도는것]);
    },
  };
}

/** 가져온 건의 자리를 바로 놓나 — 보류 값을 적는 반영만 케이스를 돌려 자리를 쓴다. 나머지 반영은 CI 를 기다리기만 한다 */
export function 자리놓을까(것: { kind: string; held?: unknown }): boolean {
  return 것.kind === 'MERGE' && !보류있나(것.held);
}
