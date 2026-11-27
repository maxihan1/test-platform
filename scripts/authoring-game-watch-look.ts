// 지켜보기의 읽기 — 멈추라 할 때까지 (Clone) 오브젝트를 표본으로 읽고, 처음 보이는 이름은 컴포넌트와 칸을 알아본다 (도메인/게임 §3.10 「지켜보기」)
// authoring-game-watch 가 300줄을 넘어 떼어 냈다
import { Game } from 'control-cli';

import { type 자리, type 칸정보, type 표본, 엔진것, 이름만, 틀칸, 화면그림인가 } from './authoring-game-watch-report.js';

/** 한 번 보고 쉬는 시간 — 조작 도우미의 명령이 밀리지 않게 */
const 간격ms = 500;
/** 한 번에 자리를 읽을 오브젝트 — 값 하나에 0.04초쯤이다 */
const 자리수 = 40;
const 값수 = 12;
const 동시 = 5;
/** 컴포넌트까지 알아볼 이름 수 */
const 알아볼이름 = 20;
const 칸수 = 14;
const 먼저볼칸 = /hp|health|life|damage|dmg|level|score|count|speed|range|cool|state|dead|target|attack/i;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const 쉼 = (ms: number): Promise<void> => new Promise((깨운다) => setTimeout(깨운다, ms));

async function 나눠<T>(들: readonly T[], 멈추나: () => boolean, 일: (x: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < 들.length && !멈추나(); i += 동시) await Promise.all(들.slice(i, i + 동시).map(일));
}

const 자리인가 = (v: unknown): v is 자리 => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number');

export interface 볼것 {
  곁: string | null;
  /** 이름 → 칸(`컴포넌트.칸`)들 */
  칸: Record<string, string[]>;
  /** 복제본 안에 든 복제본도 본다 */
  안에든것: boolean;
}

export interface 본것 {
  표본들: 표본[];
  칸: 칸정보;
  못본: Set<string>;
  /** 복제본 안에 들어 있어 뺀 것 — 이름마다 수 */
  뺀것: Record<string, number>;
}

export const 새본것 = (): 본것 => ({ 표본들: [], 칸: {}, 못본: new Set(), 뺀것: {} });

// ponytail: 이름에 (Clone) 이 붙은 것만 본다(Unity 가 판에서 만든 것). 장면에 처음부터 놓인 적이나 이름을 바꿔 만드는 게임이 나오면 바뀐 오브젝트 전체를 견준다
/**
 * 멈추라 할 때까지 보고 멈춘 뒤 한 번 더 본다(짧은 행동의 끝을 놓치지 않게) — 읽기만 한다. 한 번 못 본 것은 건너뛴다(게임이 장면을 바꾸는 중이면 없다).
 * 담긴 것은 부른 쪽이 쥔다 — 게임이 멎어 이 함수가 안 끝나도 거기까지 본 것을 낸다
 */
export async function 본다(game: Game, 것: 볼것, 멈추나: () => boolean, 담긴: 본것, 첫번봄: () => void = () => {}): Promise<void> {
  const 세대 = new Map<string, number>();
  const 자리본 = new Set<string>();
  const 나온이름 = new Set<string>();
  let 앞번호 = new Set<string>();
  let 마지막 = false;
  let 멎음 = 0;
  const 시작 = Date.now();
  const 읽는다 = async (주소: string, 칸이름: string): Promise<unknown> => {
    try {
      return await game.get(주소, 칸이름);
    } catch {
      return undefined;
    }
  };
  /** 멈추라 한 뒤의 마지막 표본은 끝까지 읽는다 — 목록을 못 받을 때만 그만둔다 */
  const 그칠까 = (): boolean => 멈추나() && !마지막;
  const 한번 = async (): Promise<Map<string, string>> => {
    const 찾은 = await game.findAll("//*[contains(@name,'(Clone)')]");
    const 초 = (Date.now() - 시작) / 1000;
    const 바깥것 = 찾은.filter((f) => f.id !== undefined && !화면그림인가(f.path));
    const 안것 = 것.안에든것 ? [] : 바깥것.filter((f) => f.path.split('/').slice(0, -1).some((x) => x.includes('(Clone)')));
    for (const [이름, 수] of Object.entries(세기(안것.map((f) => 이름만(f.path))))) 담긴.뺀것[이름] = Math.max(담긴.뺀것[이름] ?? 0, 수);
    const 줄 = 바깥것.filter((f) => !안것.includes(f)).map((f) => ({ id: f.id!, 경로: f.path, 이름: 이름만(f.path) }));
    for (const { id } of 줄) if (!앞번호.has(id)) 세대.set(id, (세대.get(id) ?? 0) + 1);
    앞번호 = new Set(줄.map((x) => x.id));
    const 열쇠 = (id: string): string => `${id}#${세대.get(id)}`;
    const s: 표본 = { 초, 보인: 줄.map((x) => ({ 열쇠: 열쇠(x.id), 이름: x.이름, 경로: x.경로 })), 자리: {}, 값: {}, 곁: null };
    const 이름별 = new Map<string, typeof 줄>();
    for (const x of 줄) {
      나온이름.add(x.이름);
      이름별.set(x.이름, [...(이름별.get(x.이름) ?? []), x]);
    }
    if (것.곁 !== null) {
      const p = await 읽는다(것.곁, 'Transform.position');
      if (자리인가(p)) s.곁 = p;
      else 담긴.못본.add(`${것.곁} 의 자리`);
    }
    // 처음 보이는 것부터(나온 자리), 다음은 보던 것(길), 그다음 이름을 돌아가며 — 수가 많은 이름이 자리를 다 차지하지 않게
    const 돌아가며: typeof 줄 = [];
    for (let i = 0; [...이름별.values()].some((v) => v.length > i); i += 1) for (const v of 이름별.values()) if (v[i] !== undefined) 돌아가며.push(v[i]!);
    const 차례 = (x: { id: string }): number => (자리본.has(열쇠(x.id)) ? 1 : 세대.get(x.id) === undefined ? 2 : 담긴.표본들.at(-1)?.보인.some((y) => y.열쇠 === 열쇠(x.id)) === true ? 2 : 0);
    const 고른 = 돌아가며.map((x, i) => ({ x, i })).sort((a, b) => 차례(a.x) - 차례(b.x) || a.i - b.i).slice(0, 자리수).map(({ x }) => x);
    await 나눠(고른, 그칠까, async (x) => {
      const p = await 읽는다(`//*[@id=${x.id}]`, 'Transform.position');
      if (!자리인가(p)) return;
      s.자리[열쇠(x.id)] = p;
      자리본.add(열쇠(x.id));
    });
    for (const [이름, 칸들] of Object.entries(것.칸)) {
      const 들 = (이름별.get(이름) ?? []).slice(0, 값수);
      for (const 칸이름 of 칸들) {
        s.값[칸이름] ??= {};
        await 나눠(들, 그칠까, async (x) => {
          const v = await 읽는다(`//*[@id=${x.id}]`, 칸이름);
          if (v !== undefined) s.값[칸이름]![열쇠(x.id)] = v;
        });
        if (들.length > 0 && !그칠까() && 들.every((x) => s.값[칸이름]![열쇠(x.id)] === undefined)) 담긴.못본.add(`${이름} 의 ${칸이름}`);
      }
    }
    담긴.표본들.push(s);
    return new Map([...이름별].map(([이름, [x]]) => [이름, `//*[@id=${x!.id}]`]));
  };
  for (;;) {
    마지막 = 멈추나();
    let 있는 = new Map<string, string>();
    try {
      있는 = await 한번();
      멎음 = 0;
    } catch (e) {
      담긴.못본.add(`목록: ${까닭(e)}`);
      멎음 += 1;
    }
    첫번봄();
    if (마지막 || 멎음 >= 5) break;
    // 한 번에 하나씩 — 스무 이름을 이어 알아보면 그동안 판을 못 본다
    const 모르는 = [...있는].find(([이름]) => 담긴.칸[이름] === undefined);
    if (모르는 !== undefined && Object.keys(담긴.칸).length < 알아볼이름) await 알아두기(game, 모르는, 담긴);
    if (!멈추나()) await 쉼(간격ms);
  }
  for (const 이름 of Object.keys(것.칸)) if (!나온이름.has(이름)) 담긴.못본.add(`${이름} 은 한 번도 안 보였다(이름은 (Clone) 까지 그대로)`);
}

const 세기 = (들: readonly string[]): Record<string, number> => {
  const r: Record<string, number> = {};
  for (const x of 들) r[x] = (r[x] ?? 0) + 1;
  return r;
};

/** 못 알아봤으면 적지 않는다 — 그 이름의 다음 것으로 다시 해 본다 */
async function 알아두기(game: Game, [이름, 주소]: readonly [string, string], 담긴: 본것): Promise<void> {
  try {
    담긴.칸[이름] = await 알아본다(game, 주소);
    담긴.못본.delete(`${이름} 의 컴포넌트`);
  } catch {
    담긴.못본.add(`${이름} 의 컴포넌트`);
  }
}

/** 그 오브젝트의 게임 컴포넌트와 값이 있는 칸 — 칸 이름이 곧 「이것이 무엇인가」의 단서다 */
async function 알아본다(game: Game, 주소: string): Promise<칸정보[string]> {
  const 컴포넌트 = (await game.components(주소)).filter((c) => !엔진것.test(c.type)).slice(0, 6);
  const 칸: string[] = [];
  for (const c of 컴포넌트) {
    const m = await game.members(주소, c.name);
    for (const f of [...m.fields, ...m.properties]) {
      if (f.static === true || 틀칸.test(f.name)) continue;
      if (f.type.startsWith('NetworkVariable')) 칸.push(`${c.name}.${f.name}.Value`);
      else if (typeof f.value === 'number' || typeof f.value === 'boolean') 칸.push(`${c.name}.${f.name}=${String(f.value)}`);
    }
  }
  return { 컴포넌트: 컴포넌트.map((c) => c.name), 칸: [...칸.filter((x) => 먼저볼칸.test(x)), ...칸.filter((x) => !먼저볼칸.test(x))].slice(0, 칸수) };
}
