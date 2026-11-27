// 기기 성능 화면 계산 검사 — 목표 벗어남 · 실행 중 요약 · 녹화 조각 고르기 · 값 글자 (도메인/성능 §3.9 「기기 성능」)

import { describe, expect, it } from 'vitest';

import type { 기기숫자 } from './perfDeviceApi.js';
import { 값글자, 결과칸들, 기본목표, 벗어난지표, 조각찾기, 지금요약, 측정종류of, 측정항목 } from './perfDeviceView.js';

const t = (키: string, 값?: Record<string, string | number>) => 키.replace(/\{([^}]+)\}/g, (_, k: string) => String(값?.[k] ?? ''));
const 줄 = (sec: number, fps: number | null, 덮: Partial<기기숫자> = {}): 기기숫자 => ({ serial: 'A', sec, loop: 1, segment: null, fps, jankPct: null, freezeCount: null, cpu: null, memMb: null, tempC: null, batteryPct: null, thermalStatus: null, gpu: null, vramMb: null, ...덮 });

describe('기기 성능 계산', () => {
  it('지금 요약은 서버와 같이 센다 — 평균 FPS · 아래 1% 평균(적어도 한 개) · 최대 온도 · 프리징 합 · 메모리 최대', () => {
    const 요약 = 지금요약([줄(0, 60, { tempC: 38, memMb: 900, freezeCount: 1 }), 줄(1, 30, { tempC: 41, freezeCount: 2 }), 줄(2, null, { memMb: 1000 })]);
    expect(요약).toMatchObject({ avgFps: 45, low1Fps: 30, maxTempC: 41, freezeCount: 3, maxMemMb: 1000 });
    expect(지금요약([])).toMatchObject({ avgFps: null, low1Fps: null, maxTempC: null, freezeCount: null });
  });

  it('목표 벗어남은 부등호 방향을 따른다. 값이 없으면 아직 모르는 것이라 벗어나지 않은 것으로 본다', () => {
    const 목표들 = [
      { metric: 'AVG_FPS' as const, op: '>=' as const, value: 45, source: 'MANUAL' as const },
      { metric: 'MAX_TEMP' as const, op: '<=' as const, value: 45, source: 'MANUAL' as const },
      { metric: 'LAUNCH_MS' as const, op: '<=' as const, value: 3000, source: 'MANUAL' as const },
    ];
    expect([...벗어난지표(목표들, { avgFps: 44.9, low1Fps: null, maxTempC: 45, freezeCount: null, maxMemMb: null, avgCpu: null, jankPerMin: null, avgGpu: null, maxVramMb: null }, 3001)]).toEqual(['AVG_FPS', 'LAUNCH_MS']);
    expect([...벗어난지표(목표들, { avgFps: null, low1Fps: null, maxTempC: null, freezeCount: null, maxMemMb: null, avgCpu: null, jankPerMin: null, avgGpu: null, maxVramMb: null }, null)]).toEqual([]);
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

  it('결과 숫자 칸 — 앱 · 게임이 보는 숫자가 다르고, 기기가 여럿이면 가장 나쁜 기기 값과 그 기기 이름 · 목표를 단다 (WEB-F7-16 · 프리징 WEB-F7-26)', () => {
    const 요약 = (avgFps: number | null, avgCpu: number | null, maxMemMb: number | null, freezeCount: number | null) => ({ avgFps, low1Fps: null, maxTempC: 38, freezeCount, maxMemMb, avgCpu, jankPerMin: avgFps === null ? null : 60 / avgFps, avgGpu: null, maxVramMb: null });
    const 결과 = {
      devices: [
        { serial: 'A', model: 'Galaxy S23', where: 'FARM' as const, launchMs: 1800, spec: null, summary: 요약(54, 31, 412, 2), verdict: null },
        { serial: 'B', model: 'Pixel 7', where: 'FARM' as const, launchMs: 2400, spec: null, summary: 요약(41, 48, 380, null), verdict: null },
      ],
      metrics: [줄(0, 50, { jankPct: 2 }), 줄(1, 50, { jankPct: 4 }), 줄(0, 40, { serial: 'B', jankPct: 1 })],
    };
    const 목표들 = [{ metric: 'AVG_FPS' as const, op: '>=' as const, value: 45, source: 'MANUAL' as const }];
    const 게임 = 결과칸들(true, 결과, 목표들, t);
    expect(게임.map((칸) => [칸.이름, 칸.값, 칸.보조.join(' · '), 칸.나쁨])).toEqual([
      ['평균 FPS', '41', 'Pixel 7 · 목표 45 이상', true],
      ['스터터', '분당 1.5회', 'Pixel 7 · 125ms 넘게 걸린 프레임', false],
      ['프레임 드랍', '3%', 'Galaxy S23', false],
      ['프리징', '2번', 'Galaxy S23 · 0.7초 넘게 정지', false],
      ['CPU 평균', '48%', 'Pixel 7', false],
      ['메모리 최대', '412MB', 'Galaxy S23', false],
    ]);
    const 앱 = 결과칸들(false, { ...결과, devices: [결과.devices[0]!] }, [], t);
    expect(앱.map((칸) => [칸.이름, 칸.값, 칸.보조.join(' · ')])).toEqual([
      ['CPU 평균', '31%', ''],
      ['메모리 최대', '412MB', ''],
      ['앱 실행 시간', '1.8초', ''],
      ['프리징', '2번', '0.7초 넘게 정지'],
    ]);
    expect(결과칸들(false, 결과, [], t).at(-1)?.보조).toEqual(['Galaxy S23', '0.7초 넘게 정지']);
  });

  it('기본 목표는 앱 · 모바일 게임 · PC 게임마다 다르다 — PC 는 배터리 온도가 없고 게임은 실행 시간 30초 (PERF-F2-06)', () => {
    const 값 = (종류: Parameters<typeof 기본목표>[0]) => Object.fromEntries(기본목표(종류).map((x) => [x.metric, x.value]));
    expect(값('APP')).toEqual({ AVG_FPS: 45, LOW1_FPS: 30, JANK_PER_MIN: 1, MAX_MEM: 1536, MAX_TEMP: 45, LAUNCH_MS: 5000 });
    expect(값('GAME')).toMatchObject({ AVG_FPS: 45, MAX_TEMP: 45, LAUNCH_MS: 30_000 });
    expect(값('PC')).toEqual({ AVG_FPS: 60, LOW1_FPS: 30, JANK_PER_MIN: 1, MAX_MEM: 4096, LAUNCH_MS: 30_000 });
    expect(기본목표('PC').find((x) => x.metric === 'JANK_PER_MIN')?.op).toBe('<=');
  });

  it('측정 종류는 애플리케이션 종류와 게임 플랫폼으로 가르고, PC 측정 항목은 배터리 대신 GPU · VRAM 이다', () => {
    expect([측정종류of({ kind: 'APP' }), 측정종류of({ kind: 'GAME', gamePlatform: 'android' }), 측정종류of({ kind: 'GAME', gamePlatform: 'windows' })]).toEqual(['APP', 'GAME', 'PC']);
    expect(측정항목('PC').map(([m]) => m)).toEqual(['FPS', 'JANK', 'CPU', 'MEM', 'GPU']);
    expect(측정항목('GAME').map(([m]) => m)).toEqual(['FPS', 'JANK', 'CPU', 'MEM', 'TEMP', 'BATTERY']);
    expect(값글자('JANK_PER_MIN', 2.25, t)).toBe('분당 2.3회');
  });
});
