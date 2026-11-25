// 조작 함수가 도는 동안 N초마다 화면을 남기는 고리 — 함수가 눈 감고 도는 1분짜리 판을 AI 가 나중에 볼 수 있게 한다 (도메인/게임 §3.10 「조작 도우미」)
import type { Game } from 'control-cli';

export interface 도중화면 {
  /** 함수가 시작한 뒤 몇 초째 */
  초: number;
  그림: Buffer;
  걸린ms: number;
}

/** 한 번 부를 때 남기는 장 수 — 판 끝이 비지 않게 간격을 미리 넓힌다(간격정하기) */
export const 상한장 = 40;
const 이어실패한도 = 3;
const 끝기다림ms = 2_000;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** 40장에서 그치면 판 끝이 비니 한도 안에 상한장이 다 들어가는 간격으로 넓힌다 */
export const 간격정하기 = (준ms: number, 한도ms: number): number => Math.max(준ms, Math.ceil(한도ms / 상한장));

export interface 찍는고리 {
  장들: 도중화면[];
  /** 새로 찍지 않게 한다 — 기다리지 않는다(입력을 쥐고 있는 시간을 늘리지 않으려고) */
  그친다: () => void;
  /** 돌던 찍기를 2초까지만 기다리고 닫는다. 못 찍은 일은 한 줄로 */
  끝난다: () => Promise<string | null>;
}

/**
 * 「간격만큼 쉬고 → 찍고 → 담기」를 도는 고리. 느린 찍기가 겹치지 않게 setInterval 을 쓰지 않는다. 첫 장은 간격 뒤다.
 * 찍기가 던져도 함수는 계속 돈다 — 세 번 이어 실패하면 그친다
 */
export function 찍기시작(게임: Pick<Game, 'screenshot'>, 간격ms: number, 시작: number): 찍는고리 {
  const 장들: 도중화면[] = [];
  let 서있다 = true;
  let 닫힘 = false;
  let 실패 = 0;
  let 이어 = 0;
  let 첫까닭: string | undefined;
  let 깨운다: (() => void) | undefined;
  const 고리 = (async (): Promise<void> => {
    while (서있다 && 장들.length < 상한장 && 이어 < 이어실패한도) {
      await new Promise<void>((다음) => {
        const 시계 = setTimeout(다음, 간격ms);
        깨운다 = (): void => {
          clearTimeout(시계);
          다음();
        };
      });
      if (!서있다) return;
      const 때 = Date.now();
      try {
        const 그림 = await 게임.screenshot();
        if (닫힘) return;
        장들.push({ 초: (때 - 시작) / 1000, 그림, 걸린ms: Date.now() - 때 });
        이어 = 0;
      } catch (e) {
        실패 += 1;
        이어 += 1;
        첫까닭 ??= 까닭(e);
      }
    }
  })();
  return {
    장들,
    그친다: () => {
      서있다 = false;
      깨운다?.();
    },
    끝난다: async () => {
      서있다 = false;
      깨운다?.();
      let 시계: NodeJS.Timeout | undefined;
      await Promise.race([고리, new Promise<void>((다음) => (시계 = setTimeout(다음, 끝기다림ms)))]);
      clearTimeout(시계);
      닫힘 = true;
      return 실패 === 0 ? null : `도중 화면 ${실패}번 못 찍음: ${첫까닭}`;
    },
  };
}
