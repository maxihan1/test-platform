import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerPerfDeviceRoutes, type PerfDeviceDeps } from './perfDevice.js';
import type { PerfRow } from './perfRead.js';

const 시리얼 = 'R5CN123';
const 앱 = 'com.app.x';

class 가짜자식 extends EventEmitter {
  끊김: (NodeJS.Signals | undefined)[] = [];
  kill(signal?: NodeJS.Signals): boolean {
    this.끊김.push(signal);
    this.emit('exit');
    return true;
  }
}

interface 가짜옵션 {
  앱없음?: '빈 출력' | '종료 코드 1';
  게임?: boolean;
}

// 폰 하나를 흉내 낸다. 읽을 때마다 세는 값이 일정하게 늘어 간격 차이를 알 수 있다
function 가짜Adb(옵션: 가짜옵션 = {}) {
  const 호출: string[] = [];
  const 횟수: Record<string, number> = {};
  const 센다 = (키: string) => (횟수[키] = (횟수[키] ?? 0) + 1);
  const adb = vi.fn(async (args: string[]): Promise<string> => {
    const 줄 = args.join(' ');
    호출.push(줄);
    if (줄 === 'devices -l') return `List of devices attached\n${시리얼} device usb:1\n`;
    if (줄.endsWith('getprop ro.product.model')) return 'Pixel 8\n';
    if (줄.endsWith('getprop ro.build.version.release')) return '14\n';
    if (줄.includes(`pm path ${앱}`)) {
      if (옵션.앱없음 === undefined) return 'package:/data/app/x/base.apk\n';
      // 요즘 폰의 pm 은 앱이 없으면 아무것도 안 찍고 종료 코드 1 을 낸다. 폰 셸의 `|| true` 가 그것을 0 으로 바꾼다
      if (옵션.앱없음 === '종료 코드 1' && !줄.endsWith('|| true')) throw new Error(`adb ${줄} 실패: Command failed`);
      return '';
    }
    if (줄.endsWith(`resolve-activity --brief ${앱}`)) return `priority=0\n${앱}/.Main\n`;
    if (줄.endsWith(`am start -W -n ${앱}/.Main`)) return 'Status: ok\nTotalTime: 700\n';
    if (줄.endsWith(`dumpsys gfxinfo ${앱}`)) {
      const k = 센다('gfx');
      return 옵션.게임 === true ? 'Total frames rendered: 0\nJanky frames: 0 (0.00%)\n' : `Total frames rendered: ${k * 120}\nJanky frames: ${k * 6} (5.00%)\n`;
    }
    if (줄.endsWith('dumpsys SurfaceFlinger --list')) return `Display 0\nSurfaceView[${앱}/.Main](BLAST)#0\n`;
    if (줄.includes('dumpsys SurfaceFlinger --latency')) {
      const k = 센다('latency');
      const 시각 = Array.from({ length: 60 }, (_, i) => k * 1e9 + i * 16_666_667);
      return `16666666\n${시각.map((t) => `${t - 5} ${t} ${t + 5}`).join('\n')}\n`;
    }
    if (줄.endsWith(`pidof ${앱}`)) return '4321\n';
    if (줄.endsWith('cat /proc/4321/stat /proc/stat')) {
      const k = 센다('cpu');
      return `4321 (${앱}) S 1 1 0 0 -1 0 0 0 0 0 ${k * 40} ${k * 10} 0 0 20 0 1 0 9\ncpu  ${k * 900} 0 ${k * 100} 0 0 0 0 0\n`;
    }
    if (줄.endsWith(`dumpsys meminfo ${앱}`)) return '  TOTAL PSS:   102400  TOTAL RSS: 1\n';
    if (줄.endsWith('dumpsys battery')) return '  level: 80\n  temperature: 305\n';
    if (줄.includes(' pull ')) {
      await writeFile(args[args.length - 1] as string, 'mp4');
      return '';
    }
    return '';
  });
  return { adb, 호출 };
}

let 폴더: string;
beforeEach(async () => {
  폴더 = await mkdtemp(join(tmpdir(), 'perf-device-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(async () => {
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  vi.restoreAllMocks();
  await rm(폴더, { recursive: true, force: true });
});

function 서버(deps: PerfDeviceDeps) {
  const app = Fastify();
  registerPerfDeviceRoutes(app, { 초ms: 10, 닫기대기ms: 0, ...deps });
  return app;
}

const 시작본문 = { runId: 7, serial: 시리얼, package: 앱, intervalSec: 2, record: false };
type App = ReturnType<typeof 서버>;

async function 시작(app: App, 본문: object = 시작본문) {
  return app.inject({ method: 'POST', url: '/perf/device/start', payload: 본문 });
}
async function 줄수를기다린다(app: App, recId: string, 수: number): Promise<{ rows: PerfRow[]; launchMs: number | null }> {
  let 답 = { rows: [] as PerfRow[], launchMs: null as number | null };
  await vi.waitFor(async () => {
    답 = (await app.inject({ method: 'GET', url: `/perf/device/${recId}` })).json();
    expect(답.rows.length).toBeGreaterThanOrEqual(수);
  });
  return 답;
}

describe('GET /perf/devices', () => {
  it('붙은 폰의 serial · 모델 · 안드로이드 버전을 준다', async () => {
    const app = 서버({ adb: 가짜Adb().adb });
    const res = await app.inject({ method: 'GET', url: '/perf/devices' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ devices: [{ serial: 시리얼, model: 'Pixel 8', os: '14' }] });
  });
  it('adb 가 없으면 200 과 빈 목록', async () => {
    const app = 서버({ adb: async () => { throw new Error('ENOENT'); } });
    const res = await app.inject({ method: 'GET', url: '/perf/devices' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ devices: [] });
  });
});

describe('측정 시작 · 조회 · 중지', () => {
  it('앱 실행 시간을 재고 간격마다 한 줄을 쌓아 파일에도 남긴다', async () => {
    const app = 서버({ adb: 가짜Adb().adb });
    const res = await 시작(app);
    expect(res.statusCode).toBe(201);
    const { recId } = res.json<{ recId: string }>();

    const { rows, launchMs } = await 줄수를기다린다(app, recId, 3);
    expect(launchMs).toBe(700);
    expect(rows[0]).toEqual({ sec: 0, fps: null, jankPct: null, cpu: null, memMb: 100, tempC: 30.5, batteryPct: 80 });
    // 한 번 읽을 때마다 렌더링 120 · 끊김 6 · 앱 틱 50 · 전체 1000 이 늘고 간격은 2초다
    expect(rows[1]).toEqual({ sec: 2, fps: 60, jankPct: 5, cpu: 5, memMb: 100, tempC: 30.5, batteryPct: 80 });
    expect(rows[2]?.sec).toBe(4);

    const 이후 = (await app.inject({ method: 'GET', url: `/perf/device/${recId}?since=2` })).json<{ rows: PerfRow[] }>();
    expect(이후.rows.every((r) => r.sec > 2)).toBe(true);
    expect(이후.rows.length).toBeGreaterThan(0);

    const stop = await app.inject({ method: 'POST', url: `/perf/device/${recId}/stop` });
    expect(stop.statusCode).toBe(200);
    expect(stop.json()).toEqual({ files: [] });

    const 줄들 = (await readFile(join(폴더, 'perf', '7', 시리얼, 'perf-metrics.jsonl'), 'utf8')).trim().split('\n');
    expect(JSON.parse(줄들[0] as string)).toEqual(rows[0]);
    expect(줄들.length).toBeGreaterThanOrEqual(3);
  });

  it('gfxinfo 가 0 인 게임은 SurfaceFlinger 표시 시각으로 FPS 를 센다', async () => {
    const app = 서버({ adb: 가짜Adb({ 게임: true }).adb });
    const { recId } = (await 시작(app, { ...시작본문, intervalSec: 1 })).json<{ recId: string }>();
    const { rows } = await 줄수를기다린다(app, recId, 2);
    expect(rows[0]?.fps).toBeNull();
    expect(rows[1]).toMatchObject({ fps: 60, jankPct: null });
    await app.inject({ method: 'POST', url: `/perf/device/${recId}/stop` });
  });

  it('모르는 recId 는 조회 · 중지 모두 404, 중지한 뒤에도 404', async () => {
    const app = 서버({ adb: 가짜Adb().adb });
    expect((await app.inject({ method: 'GET', url: '/perf/device/nope' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/perf/device/nope/stop' })).json()).toMatchObject({ error: 'NOT_FOUND' });
    const { recId } = (await 시작(app)).json<{ recId: string }>();
    await app.inject({ method: 'POST', url: `/perf/device/${recId}/stop` });
    expect((await app.inject({ method: 'GET', url: `/perf/device/${recId}` })).statusCode).toBe(404);
  });
});

describe('시작 거절', () => {
  it.each([
    ['간격이 1 · 2 · 5 가 아님', { intervalSec: 3 }],
    ['패키지에 셸 문법', { package: 'com.app.x;reboot' }],
    ['serial 이 -로 시작', { serial: '-e' }],
    ['runId 가 0', { runId: 0 }],
    ['record 가 불리언이 아님', { record: 'yes' }],
  ])('%s 이면 400 INVALID_REQUEST', async (_이름, 바꿈) => {
    const 가짜 = 가짜Adb();
    const res = await 시작(서버({ adb: 가짜.adb }), { ...시작본문, ...바꿈 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'INVALID_REQUEST' });
    expect(가짜.adb).not.toHaveBeenCalled();
  });

  it('adb 에 없는 폰이면 404 DEVICE_NOT_FOUND', async () => {
    const res = await 시작(서버({ adb: 가짜Adb().adb }), { ...시작본문, serial: 'OTHER' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'DEVICE_NOT_FOUND' });
  });

  it.each(['빈 출력', '종료 코드 1'] as const)('앱이 폰에 없으면(pm 이 %s) 400 이고 폰은 다시 잡을 수 있다', async (앱없음) => {
    const app = 서버({ adb: 가짜Adb({ 앱없음 }).adb });
    const res = await 시작(app);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'INVALID_REQUEST' });
    expect((await 시작(app)).statusCode).toBe(400);
  });

  it('같은 폰을 이미 재고 있으면 409 DEVICE_BUSY, 중지하면 다시 잡힌다', async () => {
    const app = 서버({ adb: 가짜Adb().adb });
    const { recId } = (await 시작(app)).json<{ recId: string }>();
    const 둘째 = await 시작(app);
    expect(둘째.statusCode).toBe(409);
    expect(둘째.json()).toMatchObject({ error: 'DEVICE_BUSY' });
    await app.inject({ method: 'POST', url: `/perf/device/${recId}/stop` });
    const 다시 = await 시작(app);
    expect(다시.statusCode).toBe(201);
    await app.inject({ method: 'POST', url: `/perf/device/${다시.json<{ recId: string }>().recId}/stop` });
  });
});

describe('잊힌 기록기', () => {
  it('아무도 새 줄을 받아 가지 않으면 스스로 멈추고 그 폰을 다시 잡을 수 있다', async () => {
    let 지금 = 0;
    const app = 서버({ adb: 가짜Adb().adb, now: () => 지금, 잊힘ms: 50 });
    expect((await 시작(app)).statusCode).toBe(201);
    지금 = 1_000;
    await vi.waitFor(async () => expect((await 시작(app)).statusCode).toBe(201));
  });
});

describe('화면 녹화', () => {
  it('3분 조각을 이어 받고 중지하면 마지막 조각까지 받아 이름 목록을 준다', async () => {
    const 가짜 = 가짜Adb();
    const 자식들: 가짜자식[] = [];
    const 띄운인자: string[][] = [];
    let 지금 = 0;
    const app = 서버({
      adb: 가짜.adb,
      now: () => 지금,
      잊힘ms: Infinity,
      녹화: (args) => {
        띄운인자.push(args);
        const c = new 가짜자식();
        자식들.push(c);
        return c;
      },
    });
    const { recId } = (await 시작(app, { ...시작본문, record: true })).json<{ recId: string }>();

    await vi.waitFor(() => expect(자식들.length).toBe(1));
    expect(띄운인자[0]).toEqual(['-s', 시리얼, 'shell', 'screenrecord', '--time-limit', '180', `/sdcard/qahub-${recId}-0.mp4`]);

    지금 = 180_000;
    자식들[0]?.emit('exit');
    await vi.waitFor(() => expect(자식들.length).toBe(2));
    expect(띄운인자[1]?.at(-1)).toBe(`/sdcard/qahub-${recId}-1.mp4`);

    지금 = 200_000;
    const stop = await app.inject({ method: 'POST', url: `/perf/device/${recId}/stop` });
    expect(stop.json()).toEqual({ files: ['rec-0.mp4', 'rec-180.mp4'] });
    expect(자식들[1]?.끊김).toEqual(['SIGINT']);
    expect(가짜.호출).toContain(`-s ${시리얼} shell rm /sdcard/qahub-${recId}-0.mp4`);
    expect(가짜.호출).toContain(`-s ${시리얼} shell rm /sdcard/qahub-${recId}-1.mp4`);
    expect(가짜.호출).toContain(`-s ${시리얼} shell pkill -2 -x screenrecord`);
  });
});
