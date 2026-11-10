// 기기 성능 한 줄 읽기 — adb 로 FPS · 프레임 드랍 · 프리징 · CPU · 메모리 · 온도 · 배터리를 한 번 읽는다 (SPEC 도메인/러너 「Android 에서 읽는 곳」)

import {
  type Adb,
  type 녹화자식,
  type 틱,
  type 프레임수,
  surfaceView층을찾는다,
  cpu틱을읽는다,
  gfxinfo를읽는다,
  메모리Mb를읽는다,
  배터리를읽는다,
  프레임시각들,
} from './perfAdb.js';

export interface PerfRow {
  sec: number;
  fps: number | null;
  jankPct: number | null;
  /** 그 간격에 0.7초 넘게 걸린 프레임 수(프리징) */
  freezeCount: number | null;
  cpu: number | null;
  memMb: number | null;
  tempC: number | null;
  batteryPct: number | null;
}

export interface 기록기 {
  recId: string;
  serial: string;
  pkg: string;
  intervalSec: number;
  폴더: string;
  rows: PerfRow[];
  launchMs: number | null;
  // admin 이 마지막으로 새 줄을 받아 간 때 — admin 이 다시 켜져 잊은 기록기를 스스로 멈추는 데 쓴다
  마지막조회: number;
  시작ms: number;
  멈춤: boolean;
  타이머?: NodeJS.Timeout;
  읽는중?: Promise<void>;
  녹화자식?: 녹화자식;
  녹화루프?: Promise<void>;
  이전gfx?: 프레임수 & { sec: number };
  이전cpu?: 틱;
  이전표시?: number;
  // 끊김은 직전 3프레임 시간과 견준다 — 앞 읽기의 마지막 4 프레임 시각을 들고 간다
  최근표시?: number[];
  층?: string;
  경고: Set<string>;
}

/** FPS 를 세는 데 드는 칸만 — 게임 기능 테스트 항목도 표시 시각 셈을 같이 쓴다 (gameFps.ts · WEB-F7-25) */
export type 프레임상태 = Pick<기록기, 'serial' | 'pkg' | 'intervalSec' | '이전gfx' | '층' | '이전표시' | '최근표시' | '경고'>;

const 반올림 = (x: number) => Math.round(x * 10) / 10;

const sh = (adb: Adb, r: 프레임상태, ...cmd: string[]) => adb(['-s', r.serial, 'shell', ...cmd]);

// 한 칸을 못 읽어도 줄은 남긴다. 다만 이유는 칸마다 한 번 알린다
async function 안전<T>(r: 프레임상태, 칸: string, 읽기: () => Promise<T | null>): Promise<T | null> {
  try {
    return await 읽기();
  } catch (err) {
    if (!r.경고.has(칸)) {
      r.경고.add(칸);
      console.warn(`[runner] 기기 ${r.serial} ${칸} 를 못 읽었다: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
  }
}

// 끊김 = PerfDog 기준 — 프레임 시간이 직전 3프레임 평균의 2배를 넘고 영화 2프레임(1000/24×2 ≈ 83.3ms)도 넘는다.
// 멈춤 = 프레임 사이가 0.7초를 넘는다 — 게임은 쉬지 않고 그려서 gfxinfo 와 달리 가만히 있는 것과 굳은 것을 가를 필요가 없다 (2026-11-10 사용자)
const 끊김바닥ns = (2 * 1e9) / 24;
const 멈춤ns = 0.7e9;

/** 새 프레임마다 앞 프레임과의 간격을 본다. 앞은 새것보다 이른 프레임(앞 읽기의 마지막 4개)이고 둘 다 오름차순이다.
 *  끊김 비율의 분모는 직전 3프레임이 있어 견줄 수 있었던 프레임만 센다 — 견줄 프레임이 하나도 없으면 null */
export function 끊김멈춤을센다(새것: number[], 앞: number[]): { jankPct: number | null; freezeCount: number } {
  const 전부 = [...앞, ...새것];
  let 끊김 = 0;
  let 견줌 = 0;
  let 멈춤 = 0;
  for (let i = Math.max(1, 앞.length); i < 전부.length; i += 1) {
    const 이번 = (전부[i] as number) - (전부[i - 1] as number);
    if (이번 > 멈춤ns) 멈춤 += 1;
    if (i < 4) continue;
    견줌 += 1;
    if (이번 > 2 * (((전부[i - 1] as number) - (전부[i - 4] as number)) / 3) && 이번 > 끊김바닥ns) 끊김 += 1;
  }
  return { jankPct: 견줌 === 0 ? null : 반올림((끊김 / 견줌) * 100), freezeCount: 멈춤 };
}

type 표시칸 = { fps: number; jankPct: number | null; freezeCount: number };

// 표시 시각을 세는 길 — 게임 · SurfaceView 는 gfxinfo 가 0 이라 이쪽으로 센다. 끝난 간격 안에 새로 찍힌 프레임만 센다.
// 게임 기능 테스트 항목은 gfxinfo 를 건너뛰고 FPS 만 부른다(gameFps.ts)
export async function 표시프레임칸(adb: Adb, r: 프레임상태): Promise<표시칸 | null> {
  if (r.층 === undefined) r.층 = surfaceView층을찾는다(await sh(adb, r, 'dumpsys', 'SurfaceFlinger', '--list'), r.pkg) ?? undefined;
  if (r.층 === undefined) return null;
  let 읽음: ReturnType<typeof 프레임시각들>;
  try {
    읽음 = 프레임시각들(await sh(adb, r, 'dumpsys', 'SurfaceFlinger', '--latency', `'${r.층}'`));
  } catch (err) {
    층버리기(r);
    throw err;
  }
  const 꽉참 = 읽음.꽉참;
  const 시각 = [...읽음.시각].sort((a, b) => a - b);
  // 빈 표는 오류 없이 온다 — 앱이 켜지는 동안 고른 층이 아직 버퍼를 안 받는 층일 수 있어 다음 틱에 층을 다시 찾는다
  if (시각.length === 0) {
    층버리기(r);
    return null;
  }
  const 마지막 = Math.max(...시각);
  const 처음 = Math.min(...시각);
  const 이전 = r.이전표시;
  const 앞 = r.최근표시 ?? [];
  r.이전표시 = 마지막;
  r.최근표시 = 시각.slice(-4);
  if (이전 === undefined) return null;
  const 창시작 = 마지막 - r.intervalSec * 1e9;
  // 층마다 최근 127 프레임만 온다 — 칸이 다 찼고 보이는 것이 다 새것인데 간격을 다 못 덮으면 앞이 잘린 것이라 보이는 구간의 빠르기로 센다.
  // 칸이 덜 찼으면(층이 새로 떴다) 밀려난 프레임이 없으니 그대로 센다.
  // ponytail: 잘렸으면 앞 읽기와 이어지지 않아 끊김 · 멈춤은 보이는 것끼리만 본다 — 밀려난 사이의 멈춤은 못 센다. 고주사율 게임에서 문제면 읽기 간격을 줄인다
  if (꽉참 && 처음 > 이전 && 처음 > 창시작 && 마지막 > 처음) return { fps: 반올림(((시각.length - 1) * 1e9) / (마지막 - 처음)), ...끊김멈춤을센다(시각, []) };
  // FPS 는 끝난 간격 안의 프레임만, 끊김 · 멈춤은 앞 읽기 뒤 모든 프레임을 이어서 본다 — 읽기가 늦어 간격을 건너뛰어도 사이 프레임을 빼면 가짜 멈춤이 된다
  const 뒤 = 시각.filter((t) => t > 이전);
  return { fps: 반올림(뒤.filter((t) => t > 창시작).length / r.intervalSec), ...끊김멈춤을센다(뒤, 앞.filter((t) => t <= 이전)) };
}

// 층이 바뀌면 앞 층의 마지막 프레임과 견주지 않는다 — 장면 전환에 층을 새로 만들면 가짜 멈춤이 된다
function 층버리기(r: 프레임상태): void {
  r.층 = undefined;
  r.이전표시 = undefined;
  r.최근표시 = undefined;
}

export async function 표시프레임으로(adb: Adb, r: 프레임상태): Promise<number | null> {
  return (await 표시프레임칸(adb, r))?.fps ?? null;
}

type 프레임칸 = Pick<PerfRow, 'fps' | 'jankPct' | 'freezeCount'>;

async function fps를읽는다(adb: Adb, r: 프레임상태, sec: number): Promise<프레임칸> {
  const 없음 = { fps: null, jankPct: null, freezeCount: null };
  const cur = gfxinfo를읽는다(await sh(adb, r, 'dumpsys', 'gfxinfo', r.pkg));
  const prev = r.이전gfx;
  if (cur !== null) r.이전gfx = { ...cur, sec };
  let freezeCount: number | null = null;
  if (cur !== null && prev !== undefined) {
    const 렌더 = cur.total - prev.total;
    const 끊김 = cur.janky - prev.janky;
    // 앱이 다시 떠서 세는 값이 되돌아갔다 — 이번 간격은 기준만 다시 잡는다
    if (렌더 < 0 || 끊김 < 0) return 없음;
    // 게임처럼 gfxinfo 로 하나도 안 그린 앱은 여기서 비우고 아래 표시 시각으로 센다. 그린 적이 있으면 이번 간격에 안 그렸어도 0 이다 — 가만히 있는 것이지 굳은 것이 아니다
    if (cur.total > 0 && cur.frozen !== null && prev.frozen !== null && cur.frozen >= prev.frozen) freezeCount = cur.frozen - prev.frozen;
    // 읽기가 간격보다 오래 걸려 틱을 건너뛰었으면 그만큼 쌓인 프레임이다 — 간격 한 칸이 아니라 앞 읽기부터 흐른 초로 나눈다.
    // 덤프 자체가 늦게 돌 수도 있어 폰이 덤프를 뜬 시각이 있으면 그것을, 없으면 측정 초를 쓴다
    const 흐른초 = cur.uptimeMs !== null && prev.uptimeMs !== null ? (cur.uptimeMs - prev.uptimeMs) / 1000 : sec - prev.sec;
    if (렌더 > 0) return { fps: 반올림(렌더 / 흐른초), jankPct: 반올림((끊김 / 렌더) * 100), freezeCount };
  } else if (cur !== null && cur.total > 0) {
    return 없음;
  }
  // gfxinfo 가 0 이면(게임 · SurfaceView) SurfaceFlinger 표시 시각으로 센다. gfxinfo 로 그린 적 있는 일반 앱이 이번 간격만 쉬었으면
  // FPS 만 표시 시각으로 보고 끊김 · 멈춤은 gfxinfo 것을 그대로 둔다 — 쉰 것을 멈춤으로 세지 않는다
  const 칸 = await 안전(r, 'SurfaceFlinger 프레임', () => 표시프레임칸(adb, r));
  if (cur !== null && cur.total > 0) return { fps: 칸?.fps ?? null, jankPct: null, freezeCount };
  return { fps: 칸?.fps ?? null, jankPct: 칸?.jankPct ?? null, freezeCount: 칸?.freezeCount ?? null };
}

async function cpu를읽는다(adb: Adb, r: 기록기): Promise<number | null> {
  const pid = (await sh(adb, r, 'pidof', r.pkg)).trim().split(/\s+/)[0] ?? '';
  if (!/^\d+$/.test(pid)) return null;
  const 이번 = cpu틱을읽는다(await sh(adb, r, 'cat', `/proc/${pid}/stat`, '/proc/stat'));
  const 이전 = r.이전cpu;
  r.이전cpu = 이번 ?? undefined;
  if (이번 === null || 이전 === undefined) return null;
  const 전체 = 이번.total - 이전.total;
  const 앱 = 이번.proc - 이전.proc;
  return 전체 <= 0 || 앱 < 0 ? null : 반올림((앱 / 전체) * 100);
}

/** sec 는 부르는 쪽이 시계로 정한다 — 읽기가 간격보다 오래 걸려 한 번 건너뛰어도 녹화 · 구간과 시각이 맞는다 */
export async function 한줄을읽는다(adb: Adb, r: 기록기, sec: number): Promise<PerfRow> {
  let 프레임: 프레임칸 = { fps: null, jankPct: null, freezeCount: null };
  let 배터리: { tempC: number | null; batteryPct: number | null } = { tempC: null, batteryPct: null };
  const [cpu, memMb] = await Promise.all([
    안전(r, 'CPU', () => cpu를읽는다(adb, r)),
    안전(r, '메모리', async () => 메모리Mb를읽는다(await sh(adb, r, 'dumpsys', 'meminfo', r.pkg))),
    안전(r, 'FPS', async () => {
      프레임 = await fps를읽는다(adb, r, sec);
      return null;
    }),
    안전(r, '배터리', async () => {
      배터리 = 배터리를읽는다(await sh(adb, r, 'dumpsys', 'battery'));
      return null;
    }),
  ]);
  return { sec, ...프레임, cpu, memMb, ...배터리 };
}
