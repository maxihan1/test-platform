// 기기 성능 화면 계산 검사 — 목표 벗어남 · 실행 중 요약 · 녹화 조각 고르기 · 값 글자 (도메인/성능 §3.9 「기기 성능」)

import { describe, expect, it } from 'vitest';

import type { 기기숫자 } from './perfDeviceApi.js';
import { 값글자, 벗어난지표, 조각찾기, 지금요약 } from './perfDeviceView.js';

const t = (키: string, 값?: Record<string, string | number>) => 키.replace(/\{([^}]+)\}/g, (_, k: string) => String(값?.[k] ?? ''));
const 줄 = (sec: number, fps: number | null, 덮: Partial<기기숫자> = {}): 기기숫자 => ({ serial: 'A', sec, loop: 1, segment: null, fps, jankPct: null, cpu: null, memMb: null, tempC: null, batteryPct: null, ...덮 });

describe('기기 성능 계산', () => {
  it('지금 요약은 서버와 같이 센다 — 평균 FPS · 아래 1% 평균(적어도 한 개) · 최대 온도 · 메모리 최대', () => {
    const 요약 = 지금요약([줄(0, 60, { tempC: 38, memMb: 900 }), 줄(1, 30, { tempC: 41 }), 줄(2, null, { memMb: 1000 })]);
    expect(요약).toMatchObject({ avgFps: 45, low1Fps: 30, maxTempC: 41, maxMemMb: 1000 });
    expect(지금요약([])).toMatchObject({ avgFps: null, low1Fps: null, maxTempC: null });
  });

  it('목표 벗어남은 부등호 방향을 따른다. 값이 없으면 아직 모르는 것이라 벗어나지 않은 것으로 본다', () => {
    const 목표들 = [
      { metric: 'AVG_FPS' as const, op: '>=' as const, value: 45, source: 'MANUAL' as const },
      { metric: 'MAX_TEMP' as const, op: '<=' as const, value: 45, source: 'MANUAL' as const },
      { metric: 'LAUNCH_MS' as const, op: '<=' as const, value: 3000, source: 'MANUAL' as const },
    ];
    expect([...벗어난지표(목표들, { avgFps: 44.9, low1Fps: null, maxTempC: 45, maxMemMb: null, avgCpu: null }, 3001)]).toEqual(['AVG_FPS', 'LAUNCH_MS']);
    expect([...벗어난지표(목표들, { avgFps: null, low1Fps: null, maxTempC: null, maxMemMb: null, avgCpu: null }, null)]).toEqual([]);
  });

  it('녹화 조각은 그 초 앞에서 시작한 마지막 조각이고 조각 안의 초를 돌려준다', () => {
    const 영상들 = [
      { serial: 'A', name: 'rec-0.mp4', startSec: 0 },
      { serial: 'A', name: 'rec-180.mp4', startSec: 180 },
      { serial: 'B', name: 'rec-0.mp4', startSec: 0 },
    ];
    expect(조각찾기(영상들, 'A', 200)).toEqual({ name: 'rec-180.mp4', 안초: 20 });
    expect(조각찾기(영상들, 'A', 179)).toEqual({ name: 'rec-0.mp4', 안초: 179 });
    expect(조각찾기(영상들, 'C', 10)).toBeNull();
  });

  it('값 글자는 지표 단위를 단다 — 앱 실행 시간은 초, 메모리는 1GB 부터 GB', () => {
    expect(값글자('LAUNCH_MS', 4600, t)).toBe('4.6초');
    expect(값글자('MAX_MEM', 1536, t)).toBe('1.50GB');
    expect(값글자('MAX_MEM', 900, t)).toBe('900MB');
    expect(값글자('MAX_TEMP', 46.84, t)).toBe('46.8도');
    expect(값글자('AVG_FPS', null, t)).toBe('-');
  });
});
