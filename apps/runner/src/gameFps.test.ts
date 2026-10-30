// 게임 항목 FPS 측정의 단위 테스트 — 케이스가 연 Appium 연결로 묻고 절차 번호를 붙인다. 네트워크는 fetch 가짜로 막는다 (WEB-F7-25)

import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_FILE, runDir } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FPS를잰다 } from './gameFps.js';

const 게임 = 'com.demo.ashveil';
let 임시: string;
let 번호파일: string;
let 지금초 = 0;

// 1초마다 60 프레임 — 끝초까지의 표시 시각 127개
function latency출력(끝초: number): string {
  const 시각 = Array.from({ length: 127 }, (_, i) => Math.round(끝초 * 1e9 - ((126 - i) * 1e9) / 60));
  return `16666666\n${시각.map((t) => `${t - 5} ${t} ${t + 5}`).join('\n')}\n`;
}

const 받은것: { url: string; headers: Record<string, string>; body: { script: string; args: { command?: string; args?: string[] }[] } }[] = [];

const 가짜fetch = vi.fn(async (url: string, init: RequestInit) => {
  const body = JSON.parse(String(init.body)) as (typeof 받은것)[number]['body'];
  받은것.push({ url, headers: init.headers as Record<string, string>, body });
  if (body.script === 'mobile: getCurrentPackage') return Response.json({ value: 게임 });
  const 줄 = [body.args[0]?.command, ...(body.args[0]?.args ?? [])].join(' ');
  if (줄 === `dumpsys gfxinfo ${게임}`) return Response.json({ value: 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n' });
  if (줄 === 'dumpsys SurfaceFlinger --list') return Response.json({ value: `SurfaceView[${게임}/com.unity3d.player.UnityPlayerActivity]#0\n` });
  if (줄.startsWith('dumpsys SurfaceFlinger --latency')) return Response.json({ value: latency출력(++지금초) });
  return Response.json({ value: '' });
});

beforeEach(() => {
  임시 = mkdtempSync(join(tmpdir(), 'gamefps-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 임시;
  process.env.PLATFORM_APPIUM_URL = 'http://farm:4723/wd/hub';
  번호파일 = join(runDir('7', '70'), APPIUM_SESSION_FILE);
  mkdirSync(join(번호파일, '..'), { recursive: true });
  writeFileSync(번호파일, 'sess-1\n');
  지금초 = 0;
  받은것.length = 0;
  가짜fetch.mockClear();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  delete process.env.PLATFORM_APPIUM_URL;
  rmSync(임시, { recursive: true, force: true });
});

// 초를 넘기고 그 초의 읽기(파일 · 가짜 묻기)가 끝날 틈을 준다 — setTimeout 은 진짜 시계다
async function 틱(번: number): Promise<void> {
  for (let i = 0; i < 번; i++) {
    vi.advanceTimersByTime(1_000);
    await new Promise((r) => setTimeout(r, 200));
  }
}

describe('게임 항목 FPS 측정', () => {
  it('케이스가 연 연결로 SurfaceFlinger 프레임을 묻고 그때 돌던 절차 번호를 붙인다', async () => {
    let 단계 = 1;
    const 측정 = FPS를잰다(7, 70, '팜토큰', () => 단계, 가짜fetch as unknown as typeof fetch);
    await 틱(2);
    단계 = 3;
    await 틱(1);

    expect(await 측정.멈춘다()).toEqual([
      { seq: 1, fps: null },
      { seq: 1, fps: 60 },
      { seq: 3, fps: 60 },
    ]);
    expect(받은것.some((r) => r.body.args[0]?.args?.[0] === 'gfxinfo')).toBe(false);
    expect(받은것.filter((r) => r.body.script === 'mobile: getCurrentPackage')).toHaveLength(1);
    expect(받은것[0]!.url).toBe('http://farm:4723/wd/hub/session/sess-1/execute/sync');
    expect(받은것[0]!.headers.Authorization).toBe('Bearer 팜토큰');
    expect(받은것.find((r) => r.body.args[0]?.args?.[1] === '--latency')!.body).toEqual({
      script: 'mobile: shell',
      args: [{ command: 'dumpsys', args: ['SurfaceFlinger', '--latency', `'SurfaceView[${게임}/com.unity3d.player.UnityPlayerActivity]#0'`] }],
    });
  });

  it('첫 절차 전이거나 연결 번호 파일이 없으면 묻지도 남기지도 않는다', async () => {
    let 단계: number | undefined;
    const 측정 = FPS를잰다(7, 70, undefined, () => 단계, 가짜fetch as unknown as typeof fetch);
    await 틱(1);
    unlinkSync(번호파일);
    단계 = 2;
    await 틱(1);

    expect(await 측정.멈춘다()).toEqual([]);
    expect(가짜fetch).not.toHaveBeenCalled();
  });

  it('Appium 이 거절하면 그 초는 빈칸으로 남기고 까닭은 한 번만 알린다', async () => {
    const 경고 = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const 거절 = vi.fn(async () => new Response('adb_shell 을 허용하지 않았다', { status: 500 }));
    const 측정 = FPS를잰다(7, 70, undefined, () => 2, 거절 as unknown as typeof fetch);
    await 틱(2);

    expect(await 측정.멈춘다()).toEqual([
      { seq: 2, fps: null },
      { seq: 2, fps: null },
    ]);
    expect(경고).toHaveBeenCalledTimes(1);
    expect(String(경고.mock.calls[0]?.[0])).toContain('HTTP 500');
  });

  it('팜이 답하지 않아도 멈추면 도는 묻기를 바로 끊고 그 초는 남기지 않는다', async () => {
    const 매달림 = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, 거절) => init.signal!.addEventListener('abort', () => 거절(new Error('끊김')))),
    );
    const 측정 = FPS를잰다(7, 70, undefined, () => 2, 매달림 as unknown as typeof fetch);
    await 틱(1);
    expect(매달림).toHaveBeenCalledTimes(1);

    const 처음 = Date.now();
    expect(await 측정.멈춘다()).toEqual([]);
    expect(Date.now() - 처음).toBeLessThan(1_000);
  });
});
