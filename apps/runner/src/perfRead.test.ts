import { describe, expect, it } from 'vitest';

import type { Adb } from './perfAdb.js';
import { type 기록기, 한줄을읽는다 } from './perfRead.js';

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
    expect(await 한줄을읽는다(adb, r, 간격)).toMatchObject({ fps, jankPct: null });
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
});
