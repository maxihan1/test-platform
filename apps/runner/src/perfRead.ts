// 기기 성능 한 줄 읽기 — adb 로 FPS · 프레임 드랍 · CPU · 메모리 · 온도 · 배터리를 한 번 읽는다 (SPEC 도메인/러너 「Android 에서 읽는 곳」)

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
  층?: string;
  경고: Set<string>;
}

const 반올림 = (x: number) => Math.round(x * 10) / 10;

const sh = (adb: Adb, r: 기록기, ...cmd: string[]) => adb(['-s', r.serial, 'shell', ...cmd]);

// 한 칸을 못 읽어도 줄은 남긴다. 다만 이유는 칸마다 한 번 알린다
async function 안전(r: 기록기, 칸: string, 읽기: () => Promise<number | null>): Promise<number | null> {
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

// 표시 시각을 세는 길 — 게임 · SurfaceView 는 gfxinfo 가 0 이라 이쪽으로 센다. 끝난 간격 안에 새로 찍힌 프레임만 센다
async function 표시프레임으로(adb: Adb, r: 기록기): Promise<number | null> {
  if (r.층 === undefined) r.층 = surfaceView층을찾는다(await sh(adb, r, 'dumpsys', 'SurfaceFlinger', '--list'), r.pkg) ?? undefined;
  if (r.층 === undefined) return null;
  let 읽음: ReturnType<typeof 프레임시각들>;
  try {
    읽음 = 프레임시각들(await sh(adb, r, 'dumpsys', 'SurfaceFlinger', '--latency', `'${r.층}'`));
  } catch (err) {
    r.층 = undefined;
    throw err;
  }
  const { 시각, 꽉참 } = 읽음;
  if (시각.length === 0) return null;
  const 마지막 = Math.max(...시각);
  const 처음 = Math.min(...시각);
  const 이전 = r.이전표시;
  r.이전표시 = 마지막;
  if (이전 === undefined) return null;
  const 창시작 = 마지막 - r.intervalSec * 1e9;
  // 층마다 최근 127 프레임만 온다 — 칸이 다 찼고 보이는 것이 다 새것인데 간격을 다 못 덮으면 앞이 잘린 것이라 보이는 구간의 빠르기로 센다.
  // 칸이 덜 찼으면(층이 새로 떴다) 밀려난 프레임이 없으니 그대로 센다
  if (꽉참 && 처음 > 이전 && 처음 > 창시작 && 마지막 > 처음) return 반올림(((시각.length - 1) * 1e9) / (마지막 - 처음));
  const 새것 = 시각.filter((t) => t > 이전 && t >= 창시작);
  return 반올림(새것.length / r.intervalSec);
}

async function fps를읽는다(adb: Adb, r: 기록기, sec: number): Promise<{ fps: number | null; jankPct: number | null }> {
  const 없음 = { fps: null, jankPct: null };
  const cur = gfxinfo를읽는다(await sh(adb, r, 'dumpsys', 'gfxinfo', r.pkg));
  const prev = r.이전gfx;
  if (cur !== null) r.이전gfx = { ...cur, sec };
  if (cur !== null && prev !== undefined) {
    const 렌더 = cur.total - prev.total;
    const 끊김 = cur.janky - prev.janky;
    // 앱이 다시 떠서 세는 값이 되돌아갔다 — 이번 간격은 기준만 다시 잡는다
    if (렌더 < 0 || 끊김 < 0) return 없음;
    // 읽기가 간격보다 오래 걸려 틱을 건너뛰었으면 그만큼 쌓인 프레임이다 — 간격 한 칸이 아니라 앞 읽기부터 흐른 초로 나눈다.
    // 덤프 자체가 늦게 돌 수도 있어 폰이 덤프를 뜬 시각이 있으면 그것을, 없으면 측정 초를 쓴다
    const 흐른초 = cur.uptimeMs !== null && prev.uptimeMs !== null ? (cur.uptimeMs - prev.uptimeMs) / 1000 : sec - prev.sec;
    if (렌더 > 0) return { fps: 반올림(렌더 / 흐른초), jankPct: 반올림((끊김 / 렌더) * 100) };
  } else if (cur !== null && cur.total > 0) {
    return 없음;
  }
  return { fps: await 안전(r, 'SurfaceFlinger 프레임', () => 표시프레임으로(adb, r)), jankPct: null };
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
  let 프레임: { fps: number | null; jankPct: number | null } = { fps: null, jankPct: null };
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
