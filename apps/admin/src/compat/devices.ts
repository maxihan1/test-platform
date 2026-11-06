// 호환성 디바이스 목록 — 팜(Device VISION) `GET /api/devices` 의 칸과 상태 넷을 그대로 옮긴다 (도메인/호환성 §7 · 비전 안내서 11절)
// 기기 성능 목록(perf/devices.ts)을 안 쓰는 까닭 — 그쪽은 상태를 IDLE · BUSY 로 접고 제조사 · 해상도를 버리며 내 컴퓨터 러너 폰도 섞는다

import { 팜머리, 팜주소 } from '../execution/farm.js';
import { 서버팜토큰 } from '../execution/farmToken.js';
import { 시리얼 } from '../perf/devices.js';

const 상태들 = ['IDLE', 'OCCUPIED', 'MAINTENANCE', 'OFFLINE'] as const;
type 상태 = (typeof 상태들)[number];

export interface 호환성디바이스 {
  serial: string;
  model: string;
  manufacturer: string;
  os: string;
  resolution: string;
  state: 상태;
  marketName?: string;
  density?: number;
  inches?: number;
  formFactor?: 'phone' | 'foldable' | 'tablet';
  displays?: { size: string; inches: number }[];
  fold?: 'unfolded' | 'folded';
}

const 목록제한ms = 5_000;
const 글 = (v: unknown) => (typeof v === 'string' ? v : '');
const 수 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const 하나 = <T extends string>(v: unknown, 값들: readonly T[]) => (값들.includes(v as T) ? (v as T) : undefined);

/** 비전이 못 읽은 칸은 없다 — 모양이 틀린 칸도 없는 것으로 둔다. 모르는 상태는 OFFLINE 으로 본다(잡을 수 없다) */
export function 디바이스로(d: Record<string, unknown>): 호환성디바이스 | null {
  if (typeof d.serial !== 'string' || !시리얼.test(d.serial)) return null;
  const displays = Array.isArray(d.displays)
    ? d.displays.flatMap((x: unknown) => {
        const v = x as { size?: unknown; inches?: unknown } | null;
        return typeof v?.size === 'string' && 수(v.inches) !== undefined ? [{ size: v.size, inches: v.inches as number }] : [];
      })
    : undefined;
  const 선택칸 = {
    marketName: typeof d.marketName === 'string' && d.marketName !== '' ? d.marketName : undefined,
    density: 수(d.density),
    inches: 수(d.inches),
    formFactor: 하나(d.formFactor, ['phone', 'foldable', 'tablet'] as const),
    displays: displays !== undefined && displays.length > 0 ? displays : undefined,
    fold: 하나(d.fold, ['unfolded', 'folded'] as const),
  };
  return {
    serial: d.serial,
    model: 글(d.model) || d.serial,
    manufacturer: 글(d.manufacturer),
    os: 글(d.osVersion),
    resolution: 글(d.resolution),
    state: 하나(d.state, 상태들) ?? 'OFFLINE',
    ...Object.fromEntries(Object.entries(선택칸).filter(([, v]) => v !== undefined)),
  };
}

/** 팜이 꺼졌거나 답하지 않으면 null — 부르는 쪽이 502 FARM_UNREACHABLE 로 낸다 */
export async function 호환성디바이스목록(): Promise<호환성디바이스[] | null> {
  const 팜 = 팜주소();
  if (팜 === undefined) return null;
  try {
    const res = await fetch(`${팜}/api/devices`, { headers: 팜머리(process.env, await 서버팜토큰()), signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return null;
    const 몸 = (await res.json().catch(() => null)) as { value?: { devices?: unknown } } | null;
    const 줄들 = 몸?.value?.devices;
    if (!Array.isArray(줄들)) return null;
    return 줄들.flatMap((d: unknown) => {
      const x = typeof d === 'object' && d !== null ? 디바이스로(d as Record<string, unknown>) : null;
      return x === null ? [] : [x];
    });
  } catch (err) {
    console.error(`[compat] 팜 기기 목록을 못 읽었다: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
