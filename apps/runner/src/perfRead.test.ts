import { describe, expect, it } from 'vitest';

import type { Adb } from './perfAdb.js';
import { type 기록기, 끊김멈춤을센다, 한줄을읽는다 } from './perfRead.js';

const 앱 = 'com.app.x';

function 가짜Adb(gfx: () => string, latency: () => string = () => ''): Adb {
  return async (args) => {
    const 줄 = args.join(' ');
    if (줄.endsWith(`dumpsys gfxinfo ${앱}`)) return gfx();
    if (줄.endsWith('dumpsys SurfaceFlinger --list')) return `SurfaceView[${앱}/.Main](BLAST)#0\n`;
    if (줄.includes('dumpsys SurfaceFlinger --latency')) return latency();
    return '';
  };
}

const 기록기를만든다 = (intervalSec: number): 기록기 => ({
  recId: 'r', serial: 'S', pkg: 앱, intervalSec, 폴더: '', rows: [], launchMs: null,
  마지막조회: 0, 시작ms: 0, 멈춤: false, 경고: new Set(),
});

// SurfaceFlinger 는 층마다 최근 127 프레임만 준다 — 끝초에 끝나는 fps 빠르기의 프레임 127개
function latency출력(끝초: number, fps: number): string {
  const 시각 = Array.from({ length: 127 }, (_, i) => Math.round(끝초 * 1e9 - ((126 - i) * 1e9) / fps));
  return `16666666\n${시각.map((t) => `${t - 5} ${t} ${t + 5}`).join('\n')}\n`;
}

describe('한줄을읽는다 — gfxinfo FPS', () => {
  it('읽기가 오래 걸려 틱을 건너뛰면 그동안 흐른 초로 나눈다', async () => {
    let 렌더 = 0;
    const adb = 가짜Adb(() => `Total frames rendered: ${렌더}\nJanky frames: 0 (0.00%)\n`);
    const r = 기록기를만든다(2);
    await 한줄을읽는다(adb, r, 0);
    렌더 = 240;
    expect(await 한줄을읽는다(adb, r, 4)).toMatchObject({ sec: 4, fps: 60, jankPct: 0 });
  });

  it('덤프가 늦게 돌았으면 폰이 덤프를 뜬 시각 사이로 나눈다', async () => {
    let 덤프 = { uptimeMs: 3_600, 렌더: 0 };
    const adb = 가짜Adb(() => `Uptime: ${덤프.uptimeMs} Realtime: 1\nTotal frames rendered: ${덤프.렌더}\nJanky frames: 0 (0.00%)\n`);
    const r = 기록기를만든다(2);
    await 한줄을읽는다(adb, r, 0);
    덤프 = { uptimeMs: 4_100, 렌더: 30 };
    expect((await 한줄을읽는다(adb, r, 4)).fps).toBe(60);
  });
});

describe('한줄을읽는다 — 프리징', () => {
  it('간격 사이에 늘어난 0.7초 넘는 프레임만 센다', async () => {
    let 덤프 = { 렌더: 100, 막대: '5ms=90 750ms=1' };
    const adb = 가짜Adb(() => `Total frames rendered: ${덤프.렌더}\nJanky frames: 0 (0.00%)\nHISTOGRAM: ${덤프.막대}\n`);
    const r = 기록기를만든다(1);
    expect((await 한줄을읽는다(adb, r, 0)).freezeCount).toBeNull();
    덤프 = { 렌더: 160, 막대: '5ms=148 750ms=2 1150ms=1' };
    expect((await 한줄을읽는다(adb, r, 1)).freezeCount).toBe(2);
    expect((await 한줄을읽는다(adb, r, 2)).freezeCount).toBe(0);
  });

  it('gfxinfo 로 하나도 안 그린 게임은 SurfaceFlinger 표시 시각으로 센다 — 새 프레임이 없는 간격은 0', async () => {
    const adb = 가짜Adb(() => 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\nHISTOGRAM: 5ms=0 750ms=0\n', () => latency출력(10, 60));
    const r = 기록기를만든다(1);
    await 한줄을읽는다(adb, r, 0);
    expect((await 한줄을읽는다(adb, r, 1)).freezeCount).toBe(0);
  });
});

describe('한줄을읽는다 — SurfaceFlinger FPS', () => {
  it.each([
    [1, 60],
    [2, 90],
    [5, 60],
  ])('간격 %i초 · %ifps 게임을 127 프레임에서 자르지 않는다', async (간격, fps) => {
    let 끝초 = 10;
    const adb = 가짜Adb(() => 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n', () => latency출력(끝초, fps));
    const r = 기록기를만든다(간격);
    expect((await 한줄을읽는다(adb, r, 0)).fps).toBeNull();
    끝초 += 간격;
    expect(await 한줄을읽는다(adb, r, 간격)).toMatchObject({ fps, jankPct: 0, freezeCount: 0 });
  });

  it('층이 새로 떠 칸이 덜 찼으면 잘린 것으로 보지 않고 센다', async () => {
    let 출력 = latency출력(10, 60);
    const adb = 가짜Adb(() => 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n', () => 출력);
    const r = 기록기를만든다(5);
    await 한줄을읽는다(adb, r, 0);
    const 새층 = [14_950_000_000, 14_966_666_667, 14_983_333_333].map((t) => `${t - 5} ${t} ${t + 5}`);
    출력 = `16666666\n${[...Array.from({ length: 124 }, () => '0 0 0'), ...새층].join('\n')}\n`;
    expect((await 한줄을읽는다(adb, r, 5)).fps).toBe(0.6);
  });

  it('고른 층이 빈 표를 주면 다음 틱에 층을 다시 찾는다 — 앱이 켜지는 동안 (BLAST) 층이 늦게 뜬다', async () => {
    let 목록 = `SurfaceView[${앱}/.Main]#3\n`;
    let 끝초 = 10;
    const 물은층: string[] = [];
    const adb: Adb = async (args) => {
      const 줄 = args.join(' ');
      if (줄.endsWith(`dumpsys gfxinfo ${앱}`)) return 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n';
      if (줄.endsWith('dumpsys SurfaceFlinger --list')) return 목록;
      if (줄.includes('dumpsys SurfaceFlinger --latency')) {
        물은층.push(줄);
        return 줄.includes('(BLAST)') ? latency출력(끝초, 60) : '16666666\n';
      }
      return '';
    };
    const r = 기록기를만든다(1);
    await 한줄을읽는다(adb, r, 0);
    목록 = `SurfaceView[${앱}/.Main]#3\nSurfaceView[${앱}/.Main](BLAST)#4\n`;
    await 한줄을읽는다(adb, r, 1);
    끝초 += 1;
    expect((await 한줄을읽는다(adb, r, 2)).fps).toBe(60);
    expect(물은층.at(-1)).toContain('(BLAST)#4');
  });
});

const ms = (x: number) => x * 1e6;
// 33.3ms(30fps) 간격 프레임 시각들 — 시작 시각부터 n 개
const 고른프레임 = (시작: number, n: number) => Array.from({ length: n }, (_, i) => 시작 + Math.round((i * 1e9) / 30));

describe('끊김멈춤을센다 — 게임 · SurfaceView', () => {
  it('고르게 그리면 끊김 0% · 멈춤 0', () => {
    const 앞 = 고른프레임(0, 4);
    expect(끊김멈춤을센다(고른프레임(앞.at(-1)! + ms(33.3), 30), 앞)).toEqual({ jankPct: 0, freezeCount: 0 });
  });

  it('한 프레임이 300ms 걸리면 끊김 1번 — 30프레임 중이면 3.3%', () => {
    const 앞 = 고른프레임(0, 4);
    const 새것 = 고른프레임(앞.at(-1)! + ms(33.3), 29);
    새것.push(새것.at(-1)! + ms(300));
    expect(끊김멈춤을센다(새것, 앞)).toEqual({ jankPct: 3.3, freezeCount: 0 });
  });

  it('직전 3프레임 평균의 2배를 넘어도 83.3ms 아래면 끊김이 아니다 — 60fps 게임의 40ms 프레임', () => {
    const 앞 = Array.from({ length: 4 }, (_, i) => i * ms(16.7));
    expect(끊김멈춤을센다([앞.at(-1)! + ms(40)], 앞).jankPct).toBe(0);
  });

  it('83.3ms 를 넘어도 직전 3프레임이 원래 느렸으면 끊김이 아니다 — 10fps 로딩 화면', () => {
    const 앞 = Array.from({ length: 4 }, (_, i) => i * ms(100));
    expect(끊김멈춤을센다([앞.at(-1)! + ms(110)], 앞).jankPct).toBe(0);
  });

  it('프레임 사이가 0.7초를 넘으면 멈춤 1번 · 끊김도 1번', () => {
    const 앞 = 고른프레임(0, 4);
    expect(끊김멈춤을센다([앞.at(-1)! + ms(800)], 앞)).toEqual({ jankPct: 100, freezeCount: 1 });
  });

  it('새 프레임이 없으면 끊김은 비우고 멈춤은 0 — 굳은 간격은 다음 프레임이 올 때 센다', () => {
    expect(끊김멈춤을센다([], 고른프레임(0, 4))).toEqual({ jankPct: null, freezeCount: 0 });
  });

  it('직전 3프레임이 없는 프레임은 끊김 분모에 넣지 않는다 — 견줄 프레임이 없으면 비운다', () => {
    expect(끊김멈춤을센다([0, ms(33), ms(400)], []).jankPct).toBeNull();
    expect(끊김멈춤을센다([ms(33), ms(66), ms(99), ms(400)], [0]).jankPct).toBe(100);
  });
});

describe('한줄을읽는다 — 게임 끊김 · 멈춤', () => {
  it('앞 읽기의 마지막 프레임과 이어서 센다 — 간격 첫 프레임이 늦게 와도 잡는다', async () => {
    let 출력 = '';
    const 표 = (시각: number[]) => `16666666\n${[...Array.from({ length: 127 - 시각.length }, () => '0 0 0'), ...시각.map((t) => `${t - 5} ${t} ${t + 5}`)].join('\n')}\n`;
    const adb = 가짜Adb(() => 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n', () => 출력);
    const r = 기록기를만든다(1);
    const 첫간격 = 고른프레임(ms(10_000), 30);
    출력 = 표(첫간격);
    await 한줄을읽는다(adb, r, 0);
    const 둘째 = 고른프레임(첫간격.at(-1)! + ms(900), 29);
    출력 = 표([...첫간격, ...둘째]);
    expect(await 한줄을읽는다(adb, r, 1)).toMatchObject({ fps: 29, freezeCount: 1, jankPct: 3.4 });
  });
});

describe('한줄을읽는다 — 끊김 · 멈춤 가짜를 만들지 않는다', () => {
  const 게임gfx = () => 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n';

  it('읽기가 늦어 간격을 건너뛰어도 사이 프레임과 이어서 봐 멈춤으로 세지 않는다', async () => {
    let 끝초 = 10;
    const adb = 가짜Adb(게임gfx, () => latency출력(끝초, 60));
    const r = 기록기를만든다(1);
    await 한줄을읽는다(adb, r, 0);
    끝초 = 12;
    expect(await 한줄을읽는다(adb, r, 2)).toMatchObject({ fps: 60, jankPct: 0, freezeCount: 0 });
  });

  it('층이 바뀌면 앞 층의 마지막 프레임과 견주지 않는다', async () => {
    let 층 = 'SurfaceView[com.app.x/.Main](BLAST)#0';
    let 끝초 = 10;
    const adb: Adb = async (args) => {
      const 줄 = args.join(' ');
      if (줄.endsWith(`dumpsys gfxinfo ${앱}`)) return 게임gfx();
      if (줄.endsWith('dumpsys SurfaceFlinger --list')) return `${층}\n`;
      if (줄.includes('dumpsys SurfaceFlinger --latency')) return 줄.includes(층) ? latency출력(끝초, 60) : '16666666\n';
      return '';
    };
    const r = 기록기를만든다(1);
    await 한줄을읽는다(adb, r, 0);
    층 = 'SurfaceView[com.app.x/.Main](BLAST)#5';
    끝초 = 11;
    expect((await 한줄을읽는다(adb, r, 1)).fps).toBeNull();
    끝초 = 13;
    await 한줄을읽는다(adb, r, 2);
    끝초 = 14;
    expect((await 한줄을읽는다(adb, r, 3)).freezeCount).toBe(0);
  });

  it('gfxinfo 로 그린 적 있는 일반 앱이 쉰 간격은 표시 시각의 틈을 멈춤으로 세지 않는다', async () => {
    let 출력 = latency출력(10, 60);
    const adb = 가짜Adb(() => 'Total frames rendered: 100\nJanky frames: 0 (0.00%)\nHISTOGRAM: 5ms=100 750ms=0\n', () => 출력);
    const r = 기록기를만든다(1);
    await 한줄을읽는다(adb, r, 0);
    await 한줄을읽는다(adb, r, 1);
    출력 = latency출력(12, 60).trimEnd() + `\n${14e9 - 5} ${14e9} ${14e9 + 5}\n`;
    expect(await 한줄을읽는다(adb, r, 2)).toMatchObject({ jankPct: null, freezeCount: 0 });
  });
});
