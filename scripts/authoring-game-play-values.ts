// 계획의 숫자 읽기 — 계획으로 해 보는 동안 2초마다 볼값을 읽어 남기고, 기대와 처음 어긋난 순간을 잡아 그때 사진 한 장을 찍는다 (도메인/게임 §3.10 「회고」)
// 사진만 남기면 AI 가 다 열지 않았다(세션 2 는 0장) — 어디서 어긋났나는 숫자로 기계가 찾고, 사진은 그 순간 하나만 남긴다
import type { Game } from 'control-cli';

import { type 값기록, type 값때, type 기대, type 볼값, 기대글, 수로, 어긋난기대 } from './authoring-learn-check.js';

export const 값간격ms = 2_000;
const 이어실패한도 = 3;
const 끝기다림ms = 3_000;
/** 이만큼 지나면 첫 읽기에서 안 바뀐 값도 기대를 본다 — 판이 처음부터 기대를 깬 채 멈춰 있는 것까지 놓치지 않게. 앞 판 끝 화면은 함수 첫 동작(넘기기) 뒤 몇 초 안에 바뀐다 */
export const 첫값유예ms = 10_000;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

type 읽을게임 = Pick<Game, 'get' | 'text' | 'screenshot'>;

export interface 값읽는고리 {
  그친다: () => void;
  /** 지금까지 읽은 기록(사본 아님) — 판 중간 멈춤이 10초마다 본다 */
  지금: () => 값기록;
  /** 돌던 읽기를 기다린 뒤 기록 · 어긋난 순간 사진 · 못 읽은 일 */
  끝난다: () => Promise<{ 기록: 값기록; 사진?: Buffer; 못함: string | null }>;
}

/** 한 번 읽는다 — 칸이 있으면 오브젝트 값, 없으면 그 자리의 화면 글자. 못 읽은 값은 null */
async function 한번읽기(게임: 읽을게임, 볼: readonly 볼값[]): Promise<{ 값: Record<string, number | null>; 화면: Record<string, number | null>; 못함: string | null }> {
  const 값: Record<string, number | null> = {};
  const 화면: Record<string, number | null> = {};
  let 못함: string | null = null;
  for (const b of 볼) {
    try {
      값[b.이름] = 수로(b.칸 === undefined ? await 게임.text(b.주소) : await 게임.get(b.주소, b.칸));
    } catch (e) {
      값[b.이름] = null;
      못함 ??= `${b.이름}: ${까닭(e)}`;
    }
    if (b.화면 === undefined) continue;
    try {
      화면[b.이름] = 수로(await 게임.text(b.화면));
    } catch {
      화면[b.이름] = null;
    }
  }
  return { 값, 화면, 못함 };
}

/** 값과 화면 글자가 둘 다 읽힌 때의 절반 넘게 다르면 그 값의 주소가 틀렸다(복제본 · 늦게 바뀌는 칸) */
export function 화면다른것(때들: readonly 값때[], 볼: readonly 볼값[]): string[] {
  return 볼.filter((b) => b.화면 !== undefined).flatMap((b) => {
    const 둘다 = 때들.filter((t) => (t.값[b.이름] ?? null) !== null && (t.화면?.[b.이름] ?? null) !== null);
    const 다름 = 둘다.filter((t) => t.값[b.이름] !== t.화면![b.이름]).length;
    return 둘다.length > 0 && 다름 * 2 > 둘다.length ? [b.이름] : [];
  });
}

/** 바로 한 번 읽고 간격마다 다시 읽는다. 읽기가 던져도 함수는 계속 돈다 — 세 번 이어 다 못 읽으면 그친다 */
export function 값읽기시작(게임: 읽을게임, 계획: string, 볼: readonly 볼값[], 기대들: readonly 기대[], 시작: number, 간격ms = 값간격ms): 값읽는고리 {
  const 기록: 값기록 = { 계획, 볼값: [...볼], 간격ms, 때: [], 어긋남: null, 화면다름: [] };
  let 사진: Buffer | undefined;
  let 서있다 = true;
  let 이어 = 0;
  let 첫못함: string | null = null;
  let 깨운다: (() => void) | undefined;
  // 볼값마다 처음 읽힌 값 — 그 값에서 바뀌기 전(첫값유예ms 안)에는 그 값의 기대를 안 본다. 첫 읽기는 앞 판 끝 화면일 수 있다(#16054 · #16058 세계수 0 을 새 판 값으로 읽고 0초에 멈췄다).
  // 값마다 따로 본다 — 웨이브가 먼저 바뀌어도 세계수는 아직 앞 판 값일 수 있다
  const 처음: Record<string, number> = {};
  const 움직인 = new Set<string>();
  const 고리 = (async (): Promise<void> => {
    for (let 첫 = true; 서있다 && 이어 < 이어실패한도; 첫 = false) {
      if (!첫) {
        await new Promise<void>((다음) => {
          const 시계 = setTimeout(다음, 간격ms);
          깨운다 = (): void => {
            clearTimeout(시계);
            다음();
          };
        });
        if (!서있다) return;
      }
      const 초 = (Date.now() - 시작) / 1000;
      const r = await 한번읽기(게임, 볼);
      // 끝난다가 기록을 돌려준 뒤 늦게 끝난 읽기다 — 저장된 기록 · 마지막 화면 찍기와 엇갈리지 않게 버린다
      if (!서있다) return;
      첫못함 ??= r.못함;
      이어 = Object.values(r.값).every((v) => v === null) ? 이어 + 1 : 0;
      기록.때.push({ 초, 값: r.값, ...(Object.keys(r.화면).length === 0 ? {} : { 화면: r.화면 }) });
      for (const [k, v] of Object.entries(r.값)) {
        if (v === null) continue;
        처음[k] ??= v;
        if (처음[k] !== v) 움직인.add(k);
      }
      const 볼기대 = 초 * 1000 >= 첫값유예ms ? 기대들 : 기대들.filter((x) => 움직인.has(x.값));
      const g = 기록.어긋남 === null ? 어긋난기대(볼기대, r.값) : null;
      if (g === null) continue;
      기록.어긋남 = { 초, 값이름: g.값, 값: r.값[g.값]!, 기대: 기대글(g) };
      // 같은 순간 — 숫자를 읽은 바로 뒤에 찍는다. 못 찍어도 숫자는 남는다
      try {
        사진 = await 게임.screenshot();
      } catch (e) {
        첫못함 ??= `어긋난 순간 사진: ${까닭(e)}`;
      }
    }
  })();
  const 그친다 = (): void => {
    서있다 = false;
    깨운다?.();
  };
  return {
    그친다,
    지금: () => 기록,
    끝난다: async () => {
      그친다();
      let 시계: NodeJS.Timeout | undefined;
      await Promise.race([고리, new Promise<void>((다음) => (시계 = setTimeout(다음, 끝기다림ms)))]);
      clearTimeout(시계);
      기록.화면다름 = 화면다른것(기록.때, 볼);
      return { 기록, ...(사진 === undefined ? {} : { 사진 }), 못함: 첫못함 === null ? null : `볼값 읽기: ${첫못함}` };
    },
  };
}
