// 계획의 숫자 읽기 — 계획으로 해 보는 동안 2초마다 볼값을 읽어 남기고, 기대와 처음 어긋난 순간을 잡아 그때 사진 한 장을 찍는다 (도메인/게임 §3.10 「회고」)
// 사진만 남기면 AI 가 다 열지 않았다(세션 2 는 0장) — 어디서 어긋났나는 숫자로 기계가 찾고, 사진은 그 순간 하나만 남긴다
import type { Game } from 'control-cli';

import { type 값기록, type 값때, type 기대, type 볼값, 기대글, 수로, 어긋난기대 } from './authoring-learn-check.js';

export const 값간격ms = 2_000;
/** 이웃한 두 읽기의 가로 거리(x · z)가 이보다 작으면 그 사이 서 있었다고 본다 — 높이(y)는 점프로 흔들려 뺀다 (첫 값, 실측 뒤 고친다) */
export const 서있음거리 = 0.3;
const 끝기다림ms = 3_000;
/** 이만큼 지나면 첫 읽기에서 안 바뀐 값도 기대를 본다 — 판이 처음부터 기대를 깬 채 멈춰 있는 것까지 놓치지 않게. 앞 판 끝 화면은 함수 첫 동작(넘기기) 뒤 몇 초 안에 바뀐다 */
export const 첫값유예ms = 10_000;
/**
 * 판을 연 뒤 이 안에 장면이 바뀌고 그때까지 값이 처음 읽은 값에서 안 움직였으면 그 앞 읽기는 앞 판 결과 화면 · 로딩이라 버린다(첫 값).
 * 장면을 읽는 게임은 장면이 안 바뀌는 동안 이 시간까지 안 바뀐 값의 기대를 안 본다 — 10초에 앞 판 값으로 기대가 깨져 새 판이 열리기 전에 멈췄다
 */
export const 앞판장면ms = 20_000;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

type 읽을게임 = Pick<Game, 'get' | 'text' | 'screenshot'> & Partial<Pick<Game, 'scenes'>>;

export interface 값읽는고리 {
  그친다: () => void;
  /** 지금까지 읽은 기록(사본 아님) — 판 중간 멈춤이 10초마다 본다 */
  지금: () => 값기록;
  /** 돌던 읽기를 기다린 뒤 기록 · 어긋난 순간 사진 · 못 읽은 일 */
  끝난다: () => Promise<{ 기록: 값기록; 사진?: Buffer; 못함: string | null }>;
}

/** 위치 값을 세 수로 — {x,y,z} 객체 · 배열 · 「(1.0, 2.0, 3.0)」 글. 못 바꾸면 null */
export function 세수로(v: unknown): [number, number, number] | null {
  const 목록 = Array.isArray(v) ? v : typeof v === 'object' && v !== null ? [(v as Record<string, unknown>).x, (v as Record<string, unknown>).y, (v as Record<string, unknown>).z] : typeof v === 'string' ? (v.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number) : [];
  return 목록.length === 3 && 목록.every((x) => typeof x === 'number' && Number.isFinite(x)) ? (목록 as [number, number, number]) : null;
}

/** 위치가 둘 다 읽힌 이웃한 때 쌍 가운데 가로 거리가 서있음거리 미만인 쌍의 비율 — 쌍이 없으면 null */
export function 서있던비율(때들: readonly 값때[]): number | null {
  let 쌍 = 0;
  let 섬 = 0;
  for (let i = 1; i < 때들.length; i++) {
    const a = 때들[i - 1]!.위치;
    const b = 때들[i]!.위치;
    if (a == null || b == null) continue;
    쌍 += 1;
    if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 서있음거리) 섬 += 1;
  }
  return 쌍 === 0 ? null : 섬 / 쌍;
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

/**
 * 바로 한 번 읽고 함수가 끝날 때까지 간격마다 다시 읽는다. 읽기가 던져도 함수는 계속 돈다.
 * 못 읽어도 그치지 않는다 — 새 판으로 장면이 바뀌는 5초 동안 세 번 못 읽고 그쳐 그 판 기록 · 기대 감시가 다 끊겼다(2026-11-27 16094 맵판 · 끝막기판)
 */
export function 값읽기시작(게임: 읽을게임, 계획: string, 볼: readonly 볼값[], 기대들: readonly 기대[], 시작: number, 간격ms = 값간격ms, 위치?: { 주소: string; 칸: string }, 시작장면: string | null = null): 값읽는고리 {
  const 기록: 값기록 = { 계획, 볼값: [...볼], 간격ms, 때: [], 어긋남: null, 화면다름: [] };
  let 사진: Buffer | undefined;
  let 서있다 = true;
  let 첫못함: string | null = null;
  let 위치못함: string | null = null;
  let 깨운다: (() => void) | undefined;
  // 볼값마다 처음 읽힌 값 — 그 값에서 바뀌기 전(첫값유예ms 안)에는 그 값의 기대를 안 본다. 첫 읽기는 앞 판 끝 화면일 수 있다(#16054 · #16058 세계수 0 을 새 판 값으로 읽고 0초에 멈췄다).
  // 값마다 따로 본다 — 웨이브가 먼저 바뀌어도 세계수는 아직 앞 판 값일 수 있다
  const 처음: Record<string, number> = {};
  const 움직인 = new Set<string>();
  // 새 판을 여는 부르기는 앞 판 결과 화면에서 시작한다 — 장면이 바뀌기 전 읽기가 기록에 남아 나아감이 부풀었다(16098 셋째 맵 첫 읽기 웨이브 6 · 세계수 -4)
  // 기준은 부르기 직전에 읽은 장면 — 첫 읽기 때 장면을 못 읽어도 흔들리지 않게. 결과 → 로딩 → 판처럼 여러 번 바뀌면 바뀔 때마다 본다
  let 기준장면 = 시작장면;
  let 버린초: number | null = null;
  // 옛 SDK 는 장면을 못 읽는다 — 못 읽으면 버리지 않는다
  const 장면읽기 = (): Promise<string | null> => (게임.scenes === undefined ? Promise.resolve(null) : 게임.scenes().then((x) => (typeof x.active === 'string' ? x.active : null), () => null));
  const 고리 = (async (): Promise<void> => {
    for (let 첫 = true; 서있다; 첫 = false) {
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
      // 위치는 숫자와 같이 읽는다 — 뒤에 따로 읽으면 기대 확인 · 어긋난 순간 사진이 늦고 위치 간격도 흔들린다
      const [r, 위치답, 장면] = await Promise.all([
        한번읽기(게임, 볼),
        위치 === undefined ? undefined : 게임.get(위치.주소, 위치.칸).then((v) => ({ v: 세수로(v), 못함: null }), (e: unknown) => ({ v: null, 못함: 까닭(e) })),
        초 * 1000 < 앞판장면ms ? 장면읽기() : Promise.resolve(null),
      ]);
      // 못 읽거나 세 수로 못 바꾸면 null — 서 있던 비율은 둘 다 읽힌 쌍만 센다. 까닭은 못함으로 알린다(주소 · 칸을 틀리게 적었을 수 있다)
      const 자리 = 위치답?.v;
      if (위치답 !== undefined && 위치답.v === null) 위치못함 ??= 위치답.못함 ?? '세 수로 못 바꿨다';
      // 끝난다가 기록을 돌려준 뒤 늦게 끝난 읽기다 — 저장된 기록 · 마지막 화면 찍기와 엇갈리지 않게 버린다
      if (!서있다) return;
      첫못함 ??= r.못함 ?? (위치못함 === null ? null : `위치: ${위치못함}`);
      if (장면 !== null) {
        기준장면 ??= 장면;
        // 값이 처음에서 움직였으면 이 판이 진행되다 장면이 바뀐 것(일찍 진 판)이라 둔다
        if (장면 !== 기준장면 && 움직인.size === 0) {
          기록.때 = [];
          기록.어긋남 = null;
          사진 = undefined;
          for (const k of Object.keys(처음)) delete 처음[k];
          버린초 = 초;
        }
        기준장면 = 장면;
      }
      기록.때.push({ 초, 값: r.값, ...(Object.keys(r.화면).length === 0 ? {} : { 화면: r.화면 }), ...(자리 === undefined ? {} : { 위치: 자리 }) });
      for (const [k, v] of Object.entries(r.값)) {
        if (v === null) continue;
        처음[k] ??= v;
        if (처음[k] !== v) 움직인.add(k);
      }
      // 안 바뀐 값을 보기 시작하는 때 — 버렸으면 그때부터 첫값유예, 장면을 읽는 게임은 앞판장면까지, 못 읽으면 첫값유예
      const 유예끝 = 버린초 !== null ? 버린초 * 1000 + 첫값유예ms : 기준장면 !== null ? 앞판장면ms : 첫값유예ms;
      const 볼기대 = 초 * 1000 >= 유예끝 ? 기대들 : 기대들.filter((x) => 움직인.has(x.값));
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
      const 비율 = 서있던비율(기록.때);
      if (비율 !== null) 기록.서있음 = 비율;
      return { 기록, ...(사진 === undefined ? {} : { 사진 }), 못함: 첫못함 === null ? null : `볼값 읽기: ${첫못함}` };
    },
  };
}
