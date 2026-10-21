// 기기 성능 셈 단위 검사 — 요약 · 판정 · 구간 · 회차 · 누수

import { describe, expect, it } from 'vitest';

import { 구간묶기, 기기목표, 기기요약하기, 기기판정, 누수의심, 회차메모리, type 기기줄 } from './deviceStats.js';

const 줄 = (sec: number, o: Partial<기기줄> = {}): 기기줄 => ({ sec, loop: null, segment: null, fps: null, jankPct: null, cpu: null, memMb: null, tempC: null, batteryPct: null, ...o });

describe('기기 요약', () => {
  it('평균 FPS · 1% Low · 최대 온도 · 메모리 최대 · 평균 CPU', () => {
    const rows = Array.from({ length: 200 }, (_, i) => 줄(i, { fps: i < 2 ? 10 : 60, tempC: 30 + (i % 5), memMb: 500 + i, cpu: 20 }));
    expect(기기요약하기(rows)).toEqual({ avgFps: 59.5, low1Fps: 10, maxTempC: 34, maxMemMb: 699, avgCpu: 20 });
  });

  it('줄이 적으면 1% Low 는 가장 낮은 한 개이고 값이 없으면 null', () => {
    expect(기기요약하기([줄(0, { fps: 50 }), 줄(1, { fps: 20 }), 줄(2, { fps: null })]).low1Fps).toBe(20);
    expect(기기요약하기([줄(0)])).toEqual({ avgFps: null, low1Fps: null, maxTempC: null, maxMemMb: null, avgCpu: null });
  });
});

describe('기기 판정', () => {
  const 목표 = [
    { metric: 'AVG_FPS' as const, op: '>=' as const, value: 55, source: 'AI' as const },
    { metric: 'MAX_TEMP' as const, op: '<=' as const, value: 45, source: 'PRD' as const, reqId: 'FN-001' },
    { metric: 'LAUNCH_MS' as const, op: '<=' as const, value: 3000, source: 'MANUAL' as const },
  ];

  it('기기마다 일련번호를 scope 로 한 줄씩 쓰고 지킨 것만 통과', () => {
    const r = 기기판정('R3CT', 목표, { avgFps: 58, low1Fps: 40, maxTempC: 47, maxMemMb: 800, avgCpu: 30 }, 2500);
    expect(r.map((x) => [x.metric, x.scope, x.measured, x.verdict])).toEqual([['AVG_FPS', 'R3CT', 58, 'PASS'], ['MAX_TEMP', 'R3CT', 47, 'FAIL'], ['LAUNCH_MS', 'R3CT', 2500, 'PASS']]);
    expect(r[1]).toMatchObject({ reqId: 'FN-001', source: 'PRD' });
  });

  it('값이 없는 지표는 실패다', () => {
    const r = 기기판정('R3CT', 목표, { avgFps: null, low1Fps: null, maxTempC: null, maxMemMb: null, avgCpu: null }, null);
    expect(r.every((x) => x.measured === null && x.verdict === 'FAIL')).toBe(true);
  });

  it('지표와 부등호 방향이 어긋난 목표는 거절한다', () => {
    expect(기기목표.safeParse({ metric: 'AVG_FPS', op: '<=', value: 55, source: 'AI' }).success).toBe(false);
    expect(기기목표.safeParse({ metric: 'MAX_MEM', op: '<=', value: 900, source: 'MANUAL' }).success).toBe(true);
    expect(기기목표.safeParse({ metric: 'MAX_MEM', scope: 'x', op: '<=', value: 900, source: 'MANUAL' }).success).toBe(false);
  });
});

describe('구간 · 회차', () => {
  it('같은 회차 · 구간이 이어지는 초를 한 범위로 묶고 이름 없는 줄에서 끊는다', () => {
    const rows = [
      줄(0, { loop: 1, segment: 'TC-1 · 로그인' }), 줄(1, { loop: 1, segment: 'TC-1 · 로그인' }), 줄(2, { loop: 1, segment: 'TC-1 · 목록' }),
      줄(3), 줄(4, { loop: 2, segment: 'TC-1 · 로그인' }), 줄(5, { loop: 2, segment: 'TC-1 · 로그인' }),
    ];
    expect(구간묶기('S1', rows)).toEqual([
      { serial: 'S1', loop: 1, segment: 'TC-1 · 로그인', fromSec: 0, toSec: 1 },
      { serial: 'S1', loop: 1, segment: 'TC-1 · 목록', fromSec: 2, toSec: 2 },
      { serial: 'S1', loop: 2, segment: 'TC-1 · 로그인', fromSec: 4, toSec: 5 },
    ]);
  });

  it('회차마다 메모리 최대', () => {
    const rows = [줄(0, { loop: 1, memMb: 300 }), 줄(1, { loop: 1, memMb: 350 }), 줄(2, { loop: 2, memMb: 400 }), 줄(3, { memMb: 999 })];
    expect(회차메모리('S1', rows)).toEqual([{ serial: 'S1', loop: 1, maxMemMb: 350 }, { serial: 'S1', loop: 2, maxMemMb: 400 }]);
  });
});

describe('메모리 누수 의심', () => {
  const 회차 = (...v: number[]) => v.map((maxMemMb, i) => ({ loop: i + 1, maxMemMb }));

  it('회차가 3번 미만이거나 늘지 않으면 없다', () => {
    expect(누수의심('S1', 회차(300, 400), null)).toBeNull();
    expect(누수의심('S1', 회차(300, 300, 300), null)).toBeNull();
    expect(누수의심('S1', 회차(400, 350, 300), null)).toBeNull();
  });

  it('최소제곱 기울기를 싣고 목표가 있으면 남은 회차를 올림한다', () => {
    expect(누수의심('S1', 회차(300, 350, 400), null)).toEqual({ serial: 'S1', perLoopMb: 50, loopsToLimit: null });
    expect(누수의심('S1', 회차(300, 350, 400), 520)).toEqual({ serial: 'S1', perLoopMb: 50, loopsToLimit: 3 });
    expect(누수의심('S1', 회차(300, 350, 400), 350)).toMatchObject({ loopsToLimit: 0 });
  });
});
