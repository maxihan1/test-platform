// 기기 성능 셈 단위 검사 — 요약 · 판정 · 구간 · 회차 · 누수

import { describe, expect, it } from 'vitest';

import { 구간묶기, 기기목표, 기기요약하기, 기기판정, 누수의심, 분포거르기, 열상태바뀜, 회차끊김, 회차메모리, type 기기줄 } from './deviceStats.js';

const 줄 = (sec: number, o: Partial<기기줄> = {}): 기기줄 => ({ sec, loop: null, segment: null, fps: null, jankPct: null, freezeCount: null, cpu: null, memMb: null, tempC: null, batteryPct: null, frameHist: null, thermalStatus: null, gpu: null, vramMb: null, ...o });
const 빈요약 = { avgFps: null, low1Fps: null, jankPerMin: null, maxTempC: null, freezeCount: null, maxMemMb: null, avgCpu: null, avgGpu: null, maxVramMb: null };

describe('기기 요약', () => {
  it('평균 FPS · 최대 온도 · 프리징 합 · 메모리 최대 · 평균 CPU · 평균 GPU · VRAM 최대', () => {
    const rows = Array.from({ length: 200 }, (_, i) => 줄(i, { fps: i < 2 ? 10 : 60, tempC: 30 + (i % 5), freezeCount: i % 50 === 0 ? 2 : i === 1 ? null : 0, memMb: 500 + i, cpu: 20, gpu: i % 2 === 0 ? 40 : 50, vramMb: 1000 + i }));
    expect(기기요약하기(rows, 1)).toEqual({ ...빈요약, avgFps: 59.5, maxTempC: 34, freezeCount: 8, maxMemMb: 699, avgCpu: 20, avgGpu: 45, maxVramMb: 1199 });
  });

  it('값이 없으면 모두 null', () => {
    expect(기기요약하기([줄(0)], 1)).toEqual(빈요약);
  });

  it('1% Low 는 분포에서 가장 느린 1% 프레임의 칸 값 평균을 FPS 로 바꾼다', () => {
    const rows = [줄(0, { frameHist: { '16': 99 } }), 줄(1, { frameHist: { '200': 1 } })];
    expect(기기요약하기(rows, 1).low1Fps).toBe(4.4);
  });

  it('칸 값은 다음 칸과의 가운데이고 마지막 칸은 아래 끝이다', () => {
    expect(기기요약하기([줄(0, { frameHist: { '16': 1 } })], 1).low1Fps).toBe(60.6);
    expect(기기요약하기([줄(0, { frameHist: { '4950': 1 } })], 1).low1Fps).toBe(0.2);
  });

  it('분포가 하나도 없거나 프레임이 0 이면 1% Low 는 null', () => {
    expect(기기요약하기([줄(0, { fps: 60 })], 1).low1Fps).toBeNull();
    expect(기기요약하기([줄(0, { frameHist: {} })], 1).low1Fps).toBeNull();
  });

  it('스터터(분당)는 125ms 칸부터 위 프레임을 분포가 있는 줄의 잰 분으로 나눈다', () => {
    const rows = Array.from({ length: 30 }, (_, i) => 줄(i, { frameHist: i === 0 ? { '16': 50, '125': 1, '150': 2 } : i === 1 ? {} : i === 2 ? { '121': 0 } : { '16': 60 } }));
    expect(기기요약하기(rows, 2).jankPerMin).toBe(3);
    expect(기기요약하기([...rows, 줄(30, { frameHist: null })], 2).jankPerMin).toBe(3);
  });
});

describe('프레임 분포 거르기', () => {
  it('gfxinfo 칸 이름과 0 이상 정수만 받고 빈 분포는 그대로 둔다', () => {
    expect(분포거르기({ '16': 3, '150': 0 })).toEqual({ '16': 3, '150': 0 });
    expect(분포거르기({})).toEqual({});
  });

  it('칸이 아닌 이름 · 음수 · 소수 · 객체가 아닌 값은 null', () => {
    expect(분포거르기({ '33': 1 })).toBeNull();
    expect(분포거르기({ '16': -1 })).toBeNull();
    expect(분포거르기({ '16': 1.5 })).toBeNull();
    expect(분포거르기({ '16': '3' })).toBeNull();
    expect(분포거르기([1])).toBeNull();
    expect(분포거르기(null)).toBeNull();
    expect(분포거르기(undefined)).toBeNull();
  });
});

describe('기기 판정', () => {
  const 목표 = [
    { metric: 'AVG_FPS' as const, op: '>=' as const, value: 55, source: 'AI' as const },
    { metric: 'MAX_TEMP' as const, op: '<=' as const, value: 45, source: 'PRD' as const, reqId: 'FN-001' },
    { metric: 'JANK_PER_MIN' as const, op: '<=' as const, value: 1, source: 'MANUAL' as const },
    { metric: 'LAUNCH_MS' as const, op: '<=' as const, value: 3000, source: 'MANUAL' as const },
  ];

  it('기기마다 일련번호를 scope 로 한 줄씩 쓰고 지킨 것만 통과', () => {
    const r = 기기판정('R3CT', 목표, { ...빈요약, avgFps: 58, low1Fps: 40, jankPerMin: 1.5, maxTempC: 47, freezeCount: 0, maxMemMb: 800, avgCpu: 30 }, 2500);
    expect(r.map((x) => [x.metric, x.scope, x.measured, x.verdict])).toEqual([['AVG_FPS', 'R3CT', 58, 'PASS'], ['MAX_TEMP', 'R3CT', 47, 'FAIL'], ['JANK_PER_MIN', 'R3CT', 1.5, 'FAIL'], ['LAUNCH_MS', 'R3CT', 2500, 'PASS']]);
    expect(r[1]).toMatchObject({ reqId: 'FN-001', source: 'PRD' });
  });

  it('값이 없는 지표는 실패다', () => {
    const r = 기기판정('R3CT', 목표, 빈요약, null);
    expect(r.every((x) => x.measured === null && x.verdict === 'FAIL')).toBe(true);
  });

  it('지표와 부등호 방향이 어긋난 목표는 거절한다', () => {
    expect(기기목표.safeParse({ metric: 'AVG_FPS', op: '<=', value: 55, source: 'AI' }).success).toBe(false);
    expect(기기목표.safeParse({ metric: 'JANK_PER_MIN', op: '>=', value: 1, source: 'AI' }).success).toBe(false);
    expect(기기목표.safeParse({ metric: 'JANK_PER_MIN', op: '<=', value: 1, source: 'AI' }).success).toBe(true);
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

describe('회차 끊김 · 열 상태', () => {
  it('회차마다 스터터(분당)를 센다', () => {
    const rows = [
      줄(0, { loop: 1, frameHist: { '200': 2 } }), 줄(1, { loop: 1, frameHist: { '16': 9 } }),
      줄(2, { loop: 2, frameHist: { '16': 9 } }), 줄(3, { loop: 2, frameHist: {} }), 줄(4, { frameHist: { '200': 5 } }), 줄(5, { loop: 3 }),
    ];
    expect(회차끊김(rows, 30)).toEqual([{ loop: 1, jankPerMin: 2 }, { loop: 2, jankPerMin: 0 }, { loop: 3, jankPerMin: null }]);
  });

  it('열 상태가 앞 줄과 달라진 초만 싣고 못 읽은 줄은 건너뛴다', () => {
    const rows = [0, 1, 2, 3, 4, 5].map((sec, i) => 줄(sec, { thermalStatus: [0, 0, null, 1, 1, 0][i] ?? null }));
    expect(열상태바뀜(rows)).toEqual([{ sec: 3, status: 1 }, { sec: 5, status: 0 }]);
  });
});

describe('메모리 누수 의심', () => {
  const 회차 = (...v: number[]) => v.map((maxMemMb, i) => ({ loop: i + 1, maxMemMb }));

  it('회차가 3번 미만이거나 늘지 않으면 없다', () => {
    expect(누수의심('S1', 회차(300, 400), null)).toBeNull();
    expect(누수의심('S1', 회차(300, 300, 300), null)).toBeNull();
    expect(누수의심('S1', 회차(400, 350, 300), null)).toBeNull();
  });

  it('기울기가 첫 회차 메모리 최대의 1% 아래면 없고 1% 이상이면 싣는다', () => {
    expect(누수의심('S1', 회차(1000, 1009.9, 1019.8), null)).toBeNull();
    expect(누수의심('S1', 회차(1000, 1010, 1020), null)).toMatchObject({ perLoopMb: 10 });
  });

  it('메모리 최대가 0 보다 큰 회차가 없으면 없다', () => {
    expect(누수의심('S1', 회차(0, 0, 0), null)).toBeNull();
  });

  it('최소제곱 기울기를 싣고 목표가 있으면 남은 회차를 올림한다', () => {
    expect(누수의심('S1', 회차(300, 350, 400), null)).toEqual({ serial: 'S1', perLoopMb: 50, loopsToLimit: null });
    expect(누수의심('S1', 회차(300, 350, 400), 520)).toEqual({ serial: 'S1', perLoopMb: 50, loopsToLimit: 3 });
    expect(누수의심('S1', 회차(300, 350, 400), 350)).toMatchObject({ loopsToLimit: 0 });
  });
});
