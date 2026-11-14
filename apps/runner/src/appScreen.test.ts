// 앱 화면 읽기: 화면 XML 을 줄이는 규칙 · Appium 연결을 열고 읽고 닫는 순서 · 라우트 입구를 본다. 네트워크는 fetch 가짜로 막는다

import type { ChildProcess } from 'node:child_process';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 앱화면을읽는다, 화면을줄인다 } from './appScreen.js';
import { running } from './execute.js';
import { registerRoutes } from './routes.js';

const 화면 = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy index="0" class="hierarchy" rotation="0" width="1080" height="2400">
  <android.widget.FrameLayout index="0" package="com.shop" class="android.widget.FrameLayout" text="" clickable="false" enabled="true" scrollable="false" bounds="[0,0][1080,2400]" resource-id="" content-desc="">
    <android.view.ViewGroup index="0" text="" clickable="false" scrollable="false" bounds="[0,0][1080,2400]" resource-id="com.shop:id/root" content-desc="">
      <android.widget.TextView index="0" text="Tom &amp; Jerry &gt; 1" clickable="false" scrollable="false" bounds="[10,20][30,40]" resource-id="" content-desc="" />
      <android.widget.Button index="1" text="" clickable="true" enabled="false" scrollable="false" bounds="[10,50][30,70]" resource-id="" content-desc="로그인 > 시작" />
      <android.widget.EditText index="2" text="••••" password="true" clickable="true" scrollable="false" bounds="[10,80][30,90]" resource-id="com.shop:id/pw" content-desc="" />
    </android.view.ViewGroup>
    <android.view.View index="1" text="" clickable="false" scrollable="false" bounds="[0,0][1,1]" resource-id="" content-desc="" />
  </android.widget.FrameLayout>
</hierarchy>`;

describe('화면을줄인다', () => {
  const 줄 = 화면을줄인다(화면).split('\n');

  it('머리에 화면 크기와 남긴 요소 수를 적는다', () => {
    expect(줄[0]).toBe('화면 1080x2400 · 요소 4개');
  });

  it('이름표도 글자도 id 도 없고 누르지도 못하는 껍데기는 뺀다', () => {
    expect(줄.join('\n')).not.toContain('FrameLayout');
    expect(줄.join('\n')).not.toContain('[0,0][1,1]');
  });

  it('글자 · 이름표 · id · 누를 수 있음 · 꺼짐 · 위치를 남기고 엔티티를 푼다', () => {
    expect(줄).toContain('  TextView text="Tom & Jerry > 1" [10,20][30,40]');
    expect(줄).toContain('  Button desc="로그인 > 시작" 클릭 꺼짐 [10,50][30,70]');
  });

  it('남은 조상 기준으로 들여쓰고, 껍데기 부모는 깊이에 치지 않는다', () => {
    expect(줄[1]).toBe('ViewGroup id=com.shop:id/root [0,0][1080,2400]');
  });

  it('비밀번호 칸은 글자를 싣지 않는다', () => {
    expect(화면을줄인다(화면)).not.toContain('••••');
    expect(줄).toContain('  EditText id=com.shop:id/pw 클릭 [10,80][30,90]');
  });
});

const fetchMock = vi.fn();

function 답(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  process.env.PLATFORM_APPIUM_URL = 'http://user:pw@farm:4723/wd/hub';
  process.env.PLATFORM_APP = '/apk/dev.apk';
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(열림답()).mockResolvedValueOnce(답({ value: 화면 })).mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

function 열림답(): Response {
  return 답({ value: { sessionId: 's-1', capabilities: {} } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  running.clear();
  delete process.env.PLATFORM_APPIUM_URL;
  delete process.env.PLATFORM_APP;
  delete process.env.PLATFORM_DEVICE_UDID;
  delete process.env.PLATFORM_APPIUM_TOKEN;
});

describe('앱화면을읽는다', () => {
  it('PLATFORM_APPIUM_TOKEN 이 있으면 열기 · 읽기 · 닫기 모두 Bearer 로 보낸다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_abc';

    await 앱화면을읽는다({});

    const 부름 = fetchMock.mock.calls as [string, RequestInit][];
    expect(부름).toHaveLength(3);
    for (const [, init] of 부름) expect(new Headers(init.headers).get('authorization')).toBe('Bearer pat_abc');
  });

  it('요청의 farmToken 이 PLATFORM_APPIUM_TOKEN 보다 앞선다 — 열기 · 읽기 · 닫기 모두 그 토큰이다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_env';

    await 앱화면을읽는다({ farmToken: 'pat_dlg' });

    const 부름 = fetchMock.mock.calls as [string, RequestInit][];
    expect(부름.map(([, init]) => new Headers(init.headers).get('authorization'))).toEqual(Array(3).fill('Bearer pat_dlg'));
  });

  it('연결을 열고 · 화면을 읽고 · 닫는다 — 계정은 머리로 옮기고 설정은 케이스와 같다', async () => {
    process.env.PLATFORM_DEVICE_UDID = 'R5CT';

    const 결과 = await 앱화면을읽는다({});

    expect(결과.split('\n')[0]).toBe('화면 1080x2400 · 요소 4개');
    const 부름 = fetchMock.mock.calls as [string, RequestInit][];
    expect(부름.map(([url, init]) => `${init.method ?? 'GET'} ${url}`)).toEqual([
      'POST http://farm:4723/wd/hub/session',
      'GET http://farm:4723/wd/hub/session/s-1/source',
      'DELETE http://farm:4723/wd/hub/session/s-1',
    ]);
    expect((부름[0]![1].headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('user:pw').toString('base64')}`);
    expect(JSON.parse(부름[0]![1].body as string)).toEqual({
      capabilities: {
        alwaysMatch: {
          platformName: 'Android',
          'appium:automationName': 'UiAutomator2',
          'appium:disableIdLocatorAutocompletion': true,
          'appium:settings[waitForIdleTimeout]': 1000,
          'appium:app': '/apk/dev.apk',
          'appium:udid': 'R5CT',
        },
      },
    });
  });

  it('요청의 app · udid 가 환경값보다 앞선다', async () => {
    process.env.PLATFORM_DEVICE_UDID = 'R5CT';

    await 앱화면을읽는다({ app: '/apk/prod.apk', udid: 'ZZ' });

    const alwaysMatch = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string).capabilities.alwaysMatch;
    expect(alwaysMatch['appium:app']).toBe('/apk/prod.apk');
    expect(alwaysMatch['appium:udid']).toBe('ZZ');
  });

  it('화면을 못 읽어도 연결은 닫고 오류를 던진다', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(열림답()).mockResolvedValueOnce(답({ value: { message: 'UiAutomator 죽음' } }, 500));
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(앱화면을읽는다({})).rejects.toThrow('Appium 이 HTTP 500 로 답했다: UiAutomator 죽음');

    expect((fetchMock.mock.calls.at(-1) as [string, RequestInit])[1].method).toBe('DELETE');
  });

  it('Appium 이 화면 글을 안 주면 던지고 연결은 닫는다', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(열림답()).mockResolvedValueOnce(답({ value: null }));
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(앱화면을읽는다({})).rejects.toThrow('화면 글을 주지 않았다');

    expect((fetchMock.mock.calls.at(-1) as [string, RequestInit])[1].method).toBe('DELETE');
  });

  it('연결 주소나 앱 파일이 없으면 Appium 을 부르기 전에 던진다', async () => {
    delete process.env.PLATFORM_APP;
    await expect(앱화면을읽는다({})).rejects.toThrow('PLATFORM_APP 이 필요하다');
    delete process.env.PLATFORM_APPIUM_URL;
    await expect(앱화면을읽는다({ app: '/a.apk' })).rejects.toThrow('PLATFORM_APPIUM_URL 이 필요하다');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /app-screen', () => {
  const 보냄 = (payload: unknown) => {
    const app = Fastify();
    registerRoutes(app);
    return app.inject({ method: 'POST', url: '/app-screen', payload: payload as object });
  };

  it('화면을 { screen } 으로 돌려준다', async () => {
    const res = await 보냄({});

    expect(res.statusCode).toBe(200);
    expect(res.json().screen).toContain('화면 1080x2400');
  });

  it('본문 없이 불러도 환경값으로 읽는다 — 두 칸 다 선택이다', async () => {
    const app = Fastify();
    registerRoutes(app);

    const res = await app.inject({ method: 'POST', url: '/app-screen' });

    expect(res.statusCode).toBe(200);
  });

  it('app 에 http(s) 밖의 주소(file:// 등)를 주면 400 이다 — Appium 이 도는 PC 의 아무 파일이나 깔게 하지 않는다', async () => {
    const res = await 보냄({ app: 'file:///etc/x.apk' });

    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('돌고 있는 항목이 있으면 409 RUNNER_BUSY 다 — 폰 연결을 가로채지 않는다', async () => {
    running.set(1, { child: {} as ChildProcess, killedBy: null, platform: 'android' });

    const res = await 보냄({});

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('RUNNER_BUSY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('브라우저 항목만 돌고 있으면 막지 않는다 — 폰을 안 쓴다 (APP-F1-10)', async () => {
    running.set(1, { child: {} as ChildProcess, killedBy: null, platform: 'desktop' });

    const res = await 보냄({});

    expect(res.statusCode).not.toBe(409);
  });

  it('farmToken 을 받아 그 토큰으로 읽는다 — 공백이 든 값은 머리를 깨니 400 이다', async () => {
    expect((await 보냄({ farmToken: 'pat_dlg' })).statusCode).toBe(200);
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).get('authorization')).toBe('Bearer pat_dlg');

    fetchMock.mockClear();
    expect((await 보냄({ farmToken: 'pat_a\r\nX-Evil: 1' })).statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('오류 까닭에 섞인 팜 토큰은 지우고 싣는다', async () => {
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_env';
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(답({ value: { message: 'Bearer pat_dlg 거절 · 서버 pat_env' } }, 401));

    const res = await 보냄({ farmToken: 'pat_dlg' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'RUNNER_ERROR', detail: 'Appium 이 HTTP 401 로 답했다: Bearer ******** 거절 · 서버 ********' });
  });

  it('Appium 설정이 없으면 500 RUNNER_ERROR 에 까닭을 싣는다', async () => {
    delete process.env.PLATFORM_APPIUM_URL;

    const res = await 보냄({});

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'RUNNER_ERROR', detail: 'Android 앱 화면을 읽으려면 PLATFORM_APPIUM_URL 이 필요하다' });
  });
});
