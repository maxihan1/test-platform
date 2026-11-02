// 앱 화면 통로의 중계: 팜 폰을 잡아 러너에 앱 파일 경로 · 폰 번호를 싣고, 읽지 못한 까닭을 던지지 않고 돌려주는지 본다. 네트워크는 fetch 가짜로 막는다

import { describe, expect, it, vi } from 'vitest';

import { 폰을놓는다, 폰을바로잡는다 } from '../execution/phone.js';

import { 게임길, 앱탐색주소, 앱화면읽기, type 폰잡기 } from './appScreen.js';
import { 앱줄고르기 } from './reverse.js';

const 답 = (몸: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(몸), { status })) as unknown as typeof fetch;

describe('앱줄고르기 — 앱 화면이 고르는 줄', () => {
  const 줄들 = [
    { env: 'dev', appPath: null, isProd: false },
    { env: 'qa', appPath: '/apk/qa.apk', isProd: false },
    { env: 'stg', appPath: '/apk/stg.apk', isProd: false },
  ];

  it('요청에 대상 서버가 있으면 그 줄의 경로다 — 다른 줄에 경로가 있어도 따지지 않는다', () => {
    expect(앱줄고르기(줄들, 'stg')?.appPath ?? null).toBe('/apk/stg.apk');
    expect(앱줄고르기(줄들, 'dev')?.appPath ?? null).toBeNull();
  });

  it('대상 서버가 없으면 경로가 있는 첫 줄(env 순)이다', () => {
    expect(앱줄고르기(줄들, null)?.appPath ?? null).toBe('/apk/qa.apk');
  });

  it('「운영 서버」 줄은 경로가 있어도 건너뛴다 — 대상 서버를 짚어도, 안 짚어도', () => {
    const 운영뿐 = [
      { env: 'dev', appPath: null, isProd: false },
      { env: 'prod', appPath: '/apk/prod.apk', isProd: true },
    ];

    expect(앱줄고르기(운영뿐, null)?.appPath ?? null).toBeNull();
    expect(앱줄고르기(운영뿐, 'prod')?.appPath ?? null).toBeNull();
  });

  it('경로가 하나도 없으면 null — 앱이 없는 서비스', () => {
    expect(앱줄고르기([{ env: 'dev', appPath: null, isProd: false }], null)?.appPath ?? null).toBeNull();
    expect(앱줄고르기([], 'dev')).toBeUndefined();
  });
});

describe('앱탐색주소', () => {
  it('앱 파일 경로와 팜이 다 있으면 팜의 Appium 주소(/wd/hub)와 앱 파일을 준다', () => {
    expect(앱탐색주소('http://files/app.apk', 'http://host.docker.internal:4723')).toEqual({
      url: 'http://host.docker.internal:4723/wd/hub',
      app: 'http://files/app.apk',
    });
  });

  it('팜 주소에 /wd/hub 가 이미 붙어 있으면 다시 붙이지 않는다 — SETUP 이 안내하는 꼴이다', () => {
    expect(앱탐색주소('/apk/qa.apk', 'http://host.docker.internal:4723/wd/hub')?.url).toBe('http://host.docker.internal:4723/wd/hub');
  });

  it('앱이 없거나 팜이 없으면 null — AI 가 붙을 폰이 없다', () => {
    expect(앱탐색주소(null, 'http://farm:4723')).toBeNull();
    expect(앱탐색주소('/apk/qa.apk', undefined)).toBeNull();
  });
});

describe('앱화면읽기', () => {
  const 러너 = 'http://runner:4000';
  // 팜 대신 늘 R3CR10TCVCD 를 잡았다고 하고, 놓았는지 센다
  const 가짜잡기 = () => {
    const 기록 = { 잡음: 0, 놓음: 0 };
    const 잡기: 폰잡기 = async (일) => {
      기록.잡음 += 1;
      try {
        return await 일('R3CR10TCVCD');
      } finally {
        기록.놓음 += 1;
      }
    };
    return { 기록, 잡기 };
  };

  it('앱 파일 경로가 없으면 러너를 부르지 않고 까닭도 없이 비운다 — 앱이 없는 서비스', async () => {
    const 부르기 = 답({});

    expect(await 앱화면읽기(null, 러너, 가짜잡기().잡기, 부르기)).toEqual({ screen: null, reason: null });
    expect(부르기).not.toHaveBeenCalled();
  });

  it('디바이스 팜이 없으면 까닭을 적는다', async () => {
    expect(await 앱화면읽기('/apk/a.apk', 러너, undefined, 답({}))).toEqual({
      screen: null,
      reason: 'Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않다',
    });
  });

  it('admin 의 폰 잠금이 잡혀 있으면 팜도 러너도 부르지 않고 바쁘다고 한다 — 끝나면 잠금을 놓는다', async () => {
    const 부르기 = 답({ screen: '화면' });
    const { 기록, 잡기 } = 가짜잡기();
    expect(폰을바로잡는다()).toBe(true);

    expect(await 앱화면읽기('/a.apk', 러너, 잡기, 부르기)).toEqual({ screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' });
    expect(부르기).not.toHaveBeenCalled();
    expect(기록.잡음).toBe(0);
    폰을놓는다();

    await 앱화면읽기('/a.apk', 러너, 잡기, 부르기);
    expect(폰을바로잡는다()).toBe(true);
    폰을놓는다();
  });

  it('팜에서 잡은 폰 번호와 앱 파일 경로를 러너 /app-screen 에 싣고 화면 글을 돌려준 뒤 폰을 놓는다', async () => {
    const 부르기 = 답({ screen: '화면 1080x2400 · 요소 1개' });
    const { 기록, 잡기 } = 가짜잡기();

    const 결과 = await 앱화면읽기('/apk/a.apk', 러너, 잡기, 부르기);

    expect(결과).toEqual({ screen: '화면 1080x2400 · 요소 1개', reason: null });
    const [url, init] = (부르기 as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://runner:4000/app-screen');
    expect(JSON.parse(init.body as string)).toEqual({ app: '/apk/a.apk', udid: 'R3CR10TCVCD' });
    expect(기록).toEqual({ 잡음: 1, 놓음: 1 });
  });

  it('게임은 같은 잠금 · 같은 팜 잡기로 러너 /game-screen 을 부른다', async () => {
    const 부르기 = 답({ screen: '# 장면 Login · 화면 1080×2400' });
    const { 기록, 잡기 } = 가짜잡기();

    expect(await 앱화면읽기('https://builds/qa.apk', 러너, 잡기, 부르기, 게임길)).toEqual({ screen: '# 장면 Login · 화면 1080×2400', reason: null });
    const [url, init] = (부르기 as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://runner:4000/game-screen');
    expect(JSON.parse(init.body as string)).toEqual({ app: 'https://builds/qa.apk', udid: 'R3CR10TCVCD' });
    expect(기록).toEqual({ 잡음: 1, 놓음: 1 });
  });

  it('팜이 폰을 못 내주면 그 까닭을 적고 러너를 부르지 않는다', async () => {
    const 부르기 = 답({ screen: '화면' });
    const 못잡는팜: 폰잡기 = async (_일, 못잡음) => 못잡음('Device VISION 에 빈 폰이 없습니다');

    expect(await 앱화면읽기('/a.apk', 러너, 못잡는팜, 부르기)).toEqual({ screen: null, reason: 'Device VISION 에 빈 폰이 없습니다' });
    expect(부르기).not.toHaveBeenCalled();
  });

  it('러너가 폰이 바쁘다고(409) 하면 그 말로 적는다', async () => {
    expect(await 앱화면읽기('/a.apk', 러너, 가짜잡기().잡기, 답({ error: 'RUNNER_BUSY' }, 409))).toEqual({
      screen: null,
      reason: '폰이 다른 실행에 쓰이는 중이다',
    });
  });

  it('러너 오류는 detail 을 200자까지 싣는다', async () => {
    const 결과 = await 앱화면읽기('/a.apk', 러너, 가짜잡기().잡기, 답({ error: 'RUNNER_ERROR', detail: 'x'.repeat(500) }, 500));

    expect(결과.screen).toBeNull();
    expect(결과.reason).toBe(`러너가 화면을 못 읽었다: ${'x'.repeat(200)}…`);
  });

  it('러너에 못 닿으면 던지지 않고 까닭만 돌려준다 — 주소는 싣지 않는다', async () => {
    const 부르기 = vi.fn(async () => {
      throw new TypeError('fetch failed http://secret-host:4001');
    }) as unknown as typeof fetch;
    const { 기록, 잡기 } = 가짜잡기();

    const 결과 = await 앱화면읽기('/a.apk', 'http://secret-host:4001', 잡기, 부르기);

    expect(결과).toEqual({ screen: null, reason: '러너에 닿지 못했다: TypeError' });
    expect(기록.놓음).toBe(1);
  });
});
