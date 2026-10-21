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
  n: number;
  시작ms: number;
  멈춤: boolean;
  타이머?: NodeJS.Timeout;
  읽는중?: Promise<void>;
  녹화자식?: 녹화자식;
  녹화루프?: Promise<void>;
  이전gfx?: 프레임수;
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
  let 시각: number[];
  try {
    시각 = 프레임시각들(await sh(adb, r, 'dumpsys', 'SurfaceFlinger', '--latency', `'${r.층}'`));
  } catch (err) {
    r.층 = undefined;
    throw err;
  }
  if (시각.length === 0) return null;
  const 마지막 = Math.max(...시각);
  const 이전 = r.이전표시;
  r.이전표시 = 마지막;
  if (이전 === undefined) return null;
  const 새것 = 시각.filter((t) => t > 이전 && t >= 마지막 - r.intervalSec * 1e9);
  return 반올림(새것.length / r.intervalSec);
}

async function fps를읽는다(adb: Adb, r: 기록기): Promise<{ fps: number | null; jankPct: number | null }> {
  const 없음 = { fps: null, jankPct: null };
  const cur = gfxinfo를읽는다(await sh(adb, r, 'dumpsys', 'gfxinfo', r.pkg));
  const prev = r.이전gfx;
  if (cur !== null) r.이전gfx = cur;
  if (cur !== null && prev !== undefined) {
    const 렌더 = cur.total - prev.total;
    const 끊김 = cur.janky - prev.janky;
    // 앱이 다시 떠서 세는 값이 되돌아갔다 — 이번 간격은 기준만 다시 잡는다
    if (렌더 < 0 || 끊김 < 0) return 없음;
    if (렌더 > 0) return { fps: 반올림(렌더 / r.intervalSec), jankPct: 반올림((끊김 / 렌더) * 100) };
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

export async function 한줄을읽는다(adb: Adb, r: 기록기): Promise<PerfRow> {
  const sec = r.n * r.intervalSec;
  r.n += 1;
  let 프레임: { fps: number | null; jankPct: number | null } = { fps: null, jankPct: null };
  let 배터리: { tempC: number | null; batteryPct: number | null } = { tempC: null, batteryPct: null };
  const [cpu, memMb] = await Promise.all([
    안전(r, 'CPU', () => cpu를읽는다(adb, r)),
    안전(r, '메모리', async () => 메모리Mb를읽는다(await sh(adb, r, 'dumpsys', 'meminfo', r.pkg))),
    안전(r, 'FPS', async () => {
      프레임 = await fps를읽는다(adb, r);
      return null;
    }),
    안전(r, '배터리', async () => {
      배터리 = 배터리를읽는다(await sh(adb, r, 'dumpsys', 'battery'));
      return null;
    }),
  ]);
  return { sec, ...프레임, cpu, memMb, ...배터리 };
}
