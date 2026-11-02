// 기기 성능 기록기 — 팜 폰과 내 컴퓨터 러너 폰을 한 꼴(켜기 · 새 줄 · 파일 받기 · 놓기)로 다룬다 (도메인/러너 「기기 측정 — 팜 폰 · 내 컴퓨터 러너」)

import { createWriteStream } from 'node:fs';
import { mkdir, readdir, rename } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { 볼륨파일 } from '../artifactFile.js';
import { 팜머리, 팜주소 } from '../execution/farm.js';
import { 러너머리 } from '../execution/runnerAddr.js';

export interface 기기줄원본 {
  sec: number;
  fps: number | null;
  jankPct: number | null;
  /** 내 컴퓨터 러너가 싣는다. 팜이 아직 안 주면 없다 */
  freezeCount?: number | null;
  cpu: number | null;
  memMb: number | null;
  tempC: number | null;
  batteryPct: number | null;
}

export interface 읽음 {
  rows: 기기줄원본[];
  launchMs: number | null;
}

export interface 켜기옵션 {
  runId: number;
  package: string;
  intervalSec: number;
  record: boolean;
  /** 팜이 폰을 잡아 둘 분 */
  holdMinutes: number;
}

export interface 기록기 {
  readonly where: 'FARM' | 'LOCAL';
  readonly serial: string;
  /** 팜만 — 잡기가 끝나는 시각(ms). 모르면 null */
  잡음끝(): number | null;
  켜기(o: 켜기옵션): Promise<void>;
  새줄(since: number): Promise<읽음>;
  늘리기(): Promise<void>;
  /** 녹화 조각을 폴더에 받는다. 이름의 숫자에 오프셋(실행 기준 초)을 더해 쓴다 */
  파일받기(폴더: string, 오프셋: number): Promise<void>;
  놓기(): Promise<void>;
}

export const 녹화이름 = /^rec-(\d+)\.mp4$/;
const 팜제한ms = 10_000;
const 켜기제한ms = 60_000;
const 파일제한ms = 120_000;

// 팜이 주는 시각은 숫자(ms)나 ISO 글자일 수 있다
function 시각ms(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

async function 거절문장(res: Response): Promise<string> {
  const 몸 = (await res.json().catch(() => null)) as { refused?: unknown; detail?: unknown; error?: unknown } | null;
  const 까닭 = [몸?.refused, 몸?.detail, 몸?.error].find((x) => typeof x === 'string');
  return typeof 까닭 === 'string' ? 까닭 : `HTTP ${res.status}`;
}

export function 팜기록기(serial: string, 부르기: typeof fetch = fetch): 기록기 {
  const 주소 = () => {
    const 팜 = 팜주소();
    if (팜 === undefined) throw new Error('Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
    return `${팜}/api/devices/${encodeURIComponent(serial)}`;
  };
  let 시도함 = false;
  let 끝: number | null = null;
  let 분 = 120;

  function 잡음읽기(몸: unknown): void {
    const held = (몸 as { held?: { until?: unknown; now?: unknown } } | null)?.held;
    const until = 시각ms(held?.until);
    const now = 시각ms(held?.now);
    끝 = until !== null && now !== null ? Date.now() + (until - now) : Date.now() + 분 * 60_000;
  }

  return {
    where: 'FARM',
    serial,
    잡음끝: () => 끝,
    async 켜기(o) {
      분 = o.holdMinutes;
      let res: Response;
      try {
        res = await 부르기(`${주소()}/hold`, {
          method: 'POST', headers: { 'content-type': 'application/json', ...팜머리() },
          body: JSON.stringify({ minutes: o.holdMinutes, perf: { package: o.package, intervalSec: o.intervalSec, record: o.record } }),
          signal: AbortSignal.timeout(팜제한ms),
        });
      } catch (e) {
        // 답이 늦어 끊겼으면 팜은 잡았을 수 있다 — 놓기를 한 번 보내게 둔다 (러너 §5.2 「디바이스 팜 접속 방식」)
        시도함 = true;
        throw e;
      }
      // 거절이면 남이 잡은 폰이다. 그 폰에 놓기를 보내면 쓰던 사람이 쫓겨난다
      if (res.ok) 시도함 = true;
      if (!res.ok) throw new Error(`Device VISION 이 폰을 내주지 않았습니다: ${await 거절문장(res)}`);
      잡음읽기(await res.json().catch(() => null));
    },
    async 새줄(since) {
      const res = await 부르기(`${주소()}/perf?since=${since}`, { headers: 팜머리(), signal: AbortSignal.timeout(팜제한ms) });
      if (!res.ok) throw new Error(`Device VISION 이 측정값을 주지 않았습니다 (${await 거절문장(res)})`);
      const 몸 = (await res.json()) as Partial<읽음>;
      return { rows: 몸.rows ?? [], launchMs: typeof 몸.launchMs === 'number' ? 몸.launchMs : null };
    },
    async 늘리기() {
      const res = await 부르기(`${주소()}/hold/extend`, {
        method: 'POST', headers: { 'content-type': 'application/json', ...팜머리() }, body: JSON.stringify({ minutes: 분 }), signal: AbortSignal.timeout(팜제한ms),
      });
      if (!res.ok) throw new Error(`Device VISION 이 잡기를 늘려 주지 않았습니다: ${await 거절문장(res)}`);
      const 몸 = await res.json().catch(() => null);
      if ((몸 as { held?: unknown } | null)?.held !== undefined) 잡음읽기(몸);
      else 끝 = (끝 ?? Date.now()) + 분 * 60_000;
    },
    async 파일받기(폴더, 오프셋) {
      const 목록 = await 부르기(`${주소()}/perf/files`, { headers: 팜머리(), signal: AbortSignal.timeout(팜제한ms) });
      if (!목록.ok) throw new Error(`Device VISION 이 녹화 목록을 주지 않았습니다 (${await 거절문장(목록)})`);
      const 이름들 = ((await 목록.json()) as { files?: { name?: unknown }[] }).files?.flatMap((f) => (typeof f.name === 'string' ? [f.name] : [])) ?? [];
      await mkdir(폴더, { recursive: true });
      // 팜이 준 이름으로 경로를 짓기 전에 꼴을 본다 — 폴더 밖으로 못 나가게
      for (const 이름 of 이름들.filter((n) => 녹화이름.test(n))) {
        const res = await 부르기(`${주소()}/perf/files/${encodeURIComponent(이름)}`, { headers: 팜머리(), signal: AbortSignal.timeout(파일제한ms) });
        if (!res.ok) throw new Error(`녹화 ${이름} 를 받지 못했습니다 (${await 거절문장(res)})`);
        // 조각 하나가 수십 MB 라 통째로 메모리에 올리지 않고 흘려 쓴다
        if (res.body === null) throw new Error(`녹화 ${이름} 가 비어 있습니다`);
        await pipeline(Readable.fromWeb(res.body as WebReadableStream<Uint8Array>), createWriteStream(join(폴더, `rec-${Number(녹화이름.exec(이름)?.[1]) + 오프셋}.mp4`)));
      }
    },
    async 놓기() {
      if (!시도함) return;
      시도함 = false;
      const res = await 부르기(`${주소()}/hold`, { method: 'DELETE', headers: 팜머리(), signal: AbortSignal.timeout(팜제한ms) });
      if (!res.ok) throw new Error(`폰 ${serial} 을 놓지 못했습니다 (${await 거절문장(res)})`);
    },
  };
}

export function 로컬기록기(serial: string, 주소: string, 부르기: typeof fetch = fetch): 기록기 {
  let recId: string | null = null;
  let 폴더: string | null = null;
  let 오프셋 = 0;
  return {
    where: 'LOCAL',
    serial,
    잡음끝: () => null,
    async 켜기(o) {
      const res = await 부르기(`${주소}/perf/device/start`, {
        method: 'POST', headers: { 'content-type': 'application/json', ...러너머리() },
        body: JSON.stringify({ runId: o.runId, serial, package: o.package, intervalSec: o.intervalSec, record: o.record }),
        signal: AbortSignal.timeout(켜기제한ms),
      });
      if (!res.ok) throw new Error(`내 컴퓨터 러너가 측정을 켜지 않았습니다: ${await 거절문장(res)}`);
      recId = ((await res.json()) as { recId: string }).recId;
    },
    async 새줄(since) {
      if (recId === null) throw new Error('측정이 켜지지 않았습니다');
      const res = await 부르기(`${주소}/perf/device/${encodeURIComponent(recId)}?since=${since}`, { headers: 러너머리(), signal: AbortSignal.timeout(팜제한ms) });
      if (!res.ok) throw new Error(`내 컴퓨터 러너가 측정값을 주지 않았습니다 (${await 거절문장(res)})`);
      const 몸 = (await res.json()) as Partial<읽음>;
      return { rows: 몸.rows ?? [], launchMs: typeof 몸.launchMs === 'number' ? 몸.launchMs : null };
    },
    async 늘리기() {},
    // 러너가 이미 같은 폴더에 썼다. 멈춘 뒤 이름만 실행 기준 초로 바꾼다 — 폴더와 오프셋을 기억해 둔다
    async 파일받기(받을폴더, 받을오프셋) {
      폴더 = 받을폴더;
      오프셋 = 받을오프셋;
    },
    async 놓기() {
      if (recId === null) return;
      const id = recId;
      recId = null;
      const res = await 부르기(`${주소}/perf/device/${encodeURIComponent(id)}/stop`, { method: 'POST', headers: 러너머리(), signal: AbortSignal.timeout(파일제한ms) });
      if (!res.ok) throw new Error(`내 컴퓨터 러너가 측정을 멈추지 않았습니다: ${await 거절문장(res)}`);
      const { files } = (await res.json().catch(() => ({}))) as { files?: unknown };
      const 조각 = Array.isArray(files) ? files.filter((f): f is string => typeof f === 'string' && f === basename(f)) : [];
      if (폴더 === null) return;
      // 터널로 이은 맥 러너면 조각이 이 볼륨에 없다 — 이름을 밀기 전에 받아 온다. 같은 볼륨이면 그대로 있어 묻지 않는다 (SPEC 공통/3 §5.3 「러너 여러 대」)
      for (const f of 조각) await 볼륨파일(join(폴더, f));
      if (오프셋 !== 0) await 이름밀기(폴더, 오프셋);
    },
  };
}

/** 폴더의 녹화 조각 이름에 오프셋을 더한다 — 큰 번호부터 옮겨 겹치지 않게 */
export async function 이름밀기(폴더: string, 오프셋: number): Promise<void> {
  // 원격 러너가 조각을 하나도 안 남겼으면 이 볼륨에 폴더가 없다 — 밀 것이 없다
  const 이름들 = await readdir(폴더).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return [] as string[];
    throw err;
  });
  const 번호들 = 이름들.flatMap((n) => {
    const m = 녹화이름.exec(n);
    return m === null ? [] : [Number(m[1])];
  }).sort((a, b) => b - a);
  for (const n of 번호들) await rename(join(폴더, `rec-${n}.mp4`), join(폴더, `rec-${n + 오프셋}.mp4`));
}
