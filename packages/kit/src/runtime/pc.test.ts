// 윈도우 PC 항목의 앞뒤(끄기 → 켜기 → ping → 패드 · 끄기)를 가짜 VISION 서버로 검사한다

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PC를끈다, PC를연다 } from './pc.js';

type 받은 = { 길: string; 본문: Record<string, unknown>; 머리: string | undefined };

describe('윈도우 PC 항목', () => {
  let 서버: Server;
  let 받은것: 받은[];
  let 답: (길: string, 본문: Record<string, unknown>) => { code: number; value: unknown };
  let 주소: string;

  beforeEach(async () => {
    받은것 = [];
    답 = (길, 본문) => {
      if (길.endsWith('/stop')) return { code: 200, value: { stopped: false } };
      if (길.endsWith('/launch')) return { code: 200, value: { pid: 4321 } };
      if (본문.cmd === 'ping') return { code: 200, value: { ok: true, app: 'BossRoom', version: '0.12.0' } };
      if (본문.cmd === 'pad') return { code: 200, value: { ok: true, pad: { type: 'switch', layout: 'SwitchProControllerHID', buttons: { 'Pad.A': 'A' } }, devices: [] } };
      return { code: 200, value: { ok: true } };
    };
    서버 = createServer((req, res) => {
      let 글 = '';
      req.on('data', (c: Buffer) => (글 += c.toString()));
      req.on('end', () => {
        const 본문 = (글 === '' ? {} : JSON.parse(글)) as Record<string, unknown>;
        받은것.push({ 길: req.url ?? '', 본문, 머리: req.headers.authorization });
        const { code, value } = 답(req.url ?? '', 본문);
        res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify({ value }));
      });
    });
    await new Promise<void>((r) => 서버.listen(0, '127.0.0.1', r));
    주소 = `http://127.0.0.1:${(서버.address() as AddressInfo).port}/wd/hub`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise((r) => 서버.close(r));
  });

  const 환경 = (더: Record<string, string> = {}) => ({
    PLATFORM_ENGINE: 'GAME',
    PLATFORM_GAME_LINK: 'farm',
    PLATFORM_APPIUM_URL: 주소,
    PLATFORM_APPIUM_TOKEN: 'pat_x',
    PLATFORM_DEVICE_UDID: 'pc-pc1',
    PLATFORM_PC_GAME: 'BossRoom',
    PLATFORM_PAD: '',
    ...더,
  });
  const 차례 = () => 받은것.map((b) => (b.길.endsWith('/game') ? `game:${String(b.본문.cmd)}` : b.길));

  it('앞 게임을 끄고 켠 뒤 ping 에 답하면 패드를 한 번 정한다 — Appium 은 안 부른다', async () => {
    const { game, device } = await PC를연다(환경({ PLATFORM_PAD: 'switch' }));
    expect(차례()).toEqual(['/api/devices/pc-pc1/stop', '/api/devices/pc-pc1/launch', 'game:ping', 'game:pad']);
    expect(받은것[1]!.본문).toEqual({ game: 'BossRoom' });
    expect(받은것[3]!.본문).toEqual({ cmd: 'pad', type: 'switch' });
    expect(받은것.every((b) => b.머리 === 'Bearer pat_x')).toBe(true);
    expect(device).toEqual({ model: 'pc-pc1', osVersion: 'Windows', appVersion: null, appBuild: null });
    expect(await game.pad()).toEqual({ type: 'switch', buttons: { 'Pad.A': 'A' } });
    expect(받은것.at(-1)!.본문).toEqual({ cmd: 'pad' });
  });

  it('케이스 도중 restart 는 처음 열 때와 같은 차례로 끄고 켠 뒤 ping · 패드를 다시 한다', async () => {
    const { game } = await PC를연다(환경({ PLATFORM_PAD: 'switch' }));
    받은것 = [];
    await game.restart();
    expect(차례()).toEqual(['game:errors', '/api/devices/pc-pc1/stop', '/api/devices/pc-pc1/launch', 'game:ping', 'game:pad']);
    expect(받은것[2]!.본문).toEqual({ game: 'BossRoom' });
  });

  it('패드 없음이면 패드를 건드리지 않는다', async () => {
    await PC를연다(환경());
    expect(차례()).toEqual(['/api/devices/pc-pc1/stop', '/api/devices/pc-pc1/launch', 'game:ping']);
  });

  it('게임 이름이나 PC 번호가 없으면 VISION 을 부르기 전에 던진다', async () => {
    await expect(PC를연다(환경({ PLATFORM_PC_GAME: '' }))).rejects.toThrow('PLATFORM_PC_GAME');
    await expect(PC를연다(환경({ PLATFORM_DEVICE_UDID: '' }))).rejects.toThrow('PLATFORM_DEVICE_UDID');
    expect(받은것).toEqual([]);
  });

  it('켠 뒤 게임에 못 붙으면 켠 게임을 끄고 던진다', async () => {
    답 = (길) => (길.endsWith('/game') ? { code: 403, value: { message: '잡은 사람이 아닙니다' } } : 길.endsWith('/launch') ? { code: 200, value: { pid: 1 } } : { code: 200, value: { stopped: true } });
    await expect(PC를연다(환경())).rejects.toThrow('잡은 사람이 아닙니다');
    expect(차례()).toEqual(['/api/devices/pc-pc1/stop', '/api/devices/pc-pc1/launch', 'game:ping', '/api/devices/pc-pc1/stop']);
  });

  it('끄기가 실패해도 던지지 않는다 — 놓을 때 VISION 이 끈다', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    답 = () => ({ code: 500, value: { message: '고장' } });
    await expect(PC를끈다(환경())).resolves.toBeUndefined();
    expect(오류).toHaveBeenCalledWith(expect.stringContaining('PC 게임을 끄지 못했다'));
  });
});
