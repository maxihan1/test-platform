// 게임 화면 읽기: Appium 으로 게임을 켜고 게임 포트의 트리를 control-cli snapshot 꼴로 줄이고 닫는 순서 · 닿는 길(팜 · USB) · 라우트 입구를 본다

import type { ChildProcess } from 'node:child_process';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { openGame } = vi.hoisted(() => ({ openGame: vi.fn() }));
vi.mock('@platform/kit/game', () => ({ openGame }));

import { running } from './execute.js';
import { 게임화면을읽는다 } from './gameScreen.js';
import { registerRoutes } from './routes.js';

const 트리 = {
  scene: 'Login',
  screen: [1080, 2400],
  tree: [{ name: 'Canvas', children: [{ name: 'LoginButton', kind: 'Button', children: [{ name: 'Label', text: '로그인' }] }, { name: 'IdInput', kind: 'InputField' }] }],
};

const fetchMock = vi.fn();
const 답 = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  process.env.PLATFORM_APPIUM_URL = 'http://user:pw@farm:4723/wd/hub';
  process.env.PLATFORM_APP = 'https://builds/qa.apk';
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(답({ value: { sessionId: 's-9', capabilities: {} } })).mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  openGame.mockReset();
  openGame.mockResolvedValue({ tree: async () => 트리 });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  running.clear();
  delete process.env.PLATFORM_APPIUM_URL;
  delete process.env.PLATFORM_APP;
  delete process.env.PLATFORM_DEVICE_UDID;
});

describe('게임화면을읽는다', () => {
  it('게임 케이스 설정으로 켜고 · 팜 폰이면 팜의 게임 명령 주소로 트리를 읽고 · 닫는다', async () => {
    const 글 = await 게임화면을읽는다({ udid: 'R5CT' });

    expect(글.split('\n')[0]).toBe('# 장면 Login · 화면 1080×2400');
    expect(글).toContain('- Button LoginButton [ref=');
    const 부름 = fetchMock.mock.calls as [string, RequestInit][];
    expect(부름.map(([url, init]) => `${init.method ?? 'GET'} ${url}`)).toEqual(['POST http://farm:4723/wd/hub/session', 'DELETE http://farm:4723/wd/hub/session/s-9']);
    const caps = JSON.parse(부름[0]![1].body as string).capabilities.alwaysMatch;
    expect(caps['appium:udid']).toBe('R5CT');
    expect(caps['appium:newCommandTimeout']).toBe(300);
    expect(openGame.mock.calls[0]![0]).toMatchObject({ PLATFORM_GAME_LINK: 'farm', PLATFORM_DEVICE_UDID: 'R5CT', PLATFORM_APPIUM_URL: 'http://user:pw@farm:4723/wd/hub' });
  });

  it('폰에 같은 게임의 다른 판이 먼저 깔려 있어도 넘긴 APK 를 새로 깐다 — noReset 만 끄고 나머지는 게임 케이스 설정 그대로다', async () => {
    await 게임화면을읽는다({ udid: 'R5CT' });

    const caps = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string).capabilities.alwaysMatch;
    expect(caps['appium:noReset']).toBe(false);
    expect(caps['appium:forceAppLaunch']).toBe(true);
    expect(caps['appium:shouldTerminateApp']).toBe(true);
  });

  it('폰 번호를 안 받았으면 이 컴퓨터의 USB 폰으로 닿는다', async () => {
    process.env.PLATFORM_DEVICE_UDID = 'USB1';

    await 게임화면을읽는다({});

    expect(openGame.mock.calls[0]![0]).toMatchObject({ PLATFORM_GAME_LINK: 'usb', PLATFORM_DEVICE_UDID: 'USB1' });
  });

  it('게임이 답하지 않으면 던지고 Appium 연결은 닫는다', async () => {
    openGame.mockRejectedValue(new Error('게임이 120초 안에 답하지 않았습니다 — HTTP 502'));

    await expect(게임화면을읽는다({ udid: 'R5CT' })).rejects.toThrow('120초 안에 답하지 않았습니다');

    expect((fetchMock.mock.calls.at(-1) as [string, RequestInit])[1].method).toBe('DELETE');
  });
});

describe('POST /game-screen', () => {
  const 보냄 = (payload: unknown) => {
    const app = Fastify();
    registerRoutes(app);
    return app.inject({ method: 'POST', url: '/game-screen', payload: payload as object });
  };

  it('트리 글을 { screen } 으로 돌려준다', async () => {
    const res = await 보냄({ udid: 'R5CT' });

    expect(res.statusCode).toBe(200);
    expect(res.json().screen).toContain('# 장면 Login');
  });

  it('돌고 있는 앱 항목이 있으면 409 RUNNER_BUSY 다 — 앱 화면 읽기와 같은 문턱이다', async () => {
    running.set(1, { child: {} as ChildProcess, killedBy: null, platform: 'android' });

    const res = await 보냄({});

    expect(res.statusCode).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('게임을 못 읽으면 500 RUNNER_ERROR 에 까닭을 싣는다', async () => {
    openGame.mockRejectedValue(new Error('게임이 120초 안에 답하지 않았습니다'));

    const res = await 보냄({ udid: 'R5CT' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'RUNNER_ERROR', detail: '게임이 120초 안에 답하지 않았습니다' });
  });
});
