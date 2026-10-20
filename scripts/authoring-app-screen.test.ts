// 앱 첫 화면 받아 두기 검사 — 파일로 남기고 · 앱 없는 서비스는 아무것도 안 바꾸고 · 못 읽어도 작성은 가고 · 프롬프트 절을 싣는다
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 앱화면받기, 앱화면파일, 잡은폰놓기, 탐색환경 } from './authoring-app-screen.js';
import { 줄프롬프트 } from './authoring-prompt.js';

const 서버 = { 주소기지: 'http://admin:3000', 토큰: 't' };

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'appscreen-'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

const 서버가 = (몸: unknown, status = 200) => {
  const 부름 = vi.fn(async () => new Response(JSON.stringify(몸), { status }));
  vi.stubGlobal('fetch', 부름);
  return 부름;
};

describe('앱화면받기', () => {
  it('화면을 받으면 자료 폴더 app-screen.txt 에 쓰고 「비밀번호: 값」 꼴은 가린다', async () => {
    const 부름 = 서버가({ screen: '화면 1080x2400 · 요소 1개\nTextView text="관리자 비밀번호: Adm1n!pass"', reason: null });

    const 결과 = await 앱화면받기(서버, 7, 자료);

    expect(결과).toEqual({ 글: 앱화면파일(자료) });
    expect(readFileSync(앱화면파일(자료), 'utf8')).toContain('화면 1080x2400');
    expect(readFileSync(앱화면파일(자료), 'utf8')).not.toContain('Adm1n!pass');
    expect(부름).toHaveBeenCalledTimes(1);
    expect((부름.mock.calls[0] as unknown as [string])[0]).toBe('http://admin:3000/api/authoring/requests/7/app-screen');
  });

  it('앱이 없는 서비스(화면도 까닭도 없음)는 아무것도 안 한다', async () => {
    서버가({ screen: null, reason: null });

    expect(await 앱화면받기(서버, 7, 자료)).toBeUndefined();
    expect(existsSync(앱화면파일(자료))).toBe(false);
  });

  it('서버가 읽지 못한 까닭을 말하면 그대로 돌려준다 — 작성은 간다', async () => {
    서버가({ screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' });

    expect(await 앱화면받기(서버, 7, 자료)).toEqual({ 못읽음: '폰이 다른 실행에 쓰이는 중이다' });
    expect(existsSync(앱화면파일(자료))).toBe(false);
  });

  it('앞 실행이 남긴 화면 파일은 이번에 못 읽었으면 지운다', async () => {
    서버가({ screen: '옛 화면', reason: null });
    await 앱화면받기(서버, 7, 자료);
    expect(existsSync(앱화면파일(자료))).toBe(true);

    서버가({ screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' });
    await 앱화면받기(서버, 7, 자료);

    expect(existsSync(앱화면파일(자료))).toBe(false);
  });

  it('옛 서버(404) · 끊김은 프롬프트를 안 바꾼다 — 앱이 있는지도 모른다', async () => {
    서버가({ error: 'NOT_FOUND' }, 404);
    expect(await 앱화면받기(서버, 7, 자료)).toBeUndefined();

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    expect(await 앱화면받기(서버, 7, 자료)).toBeUndefined();
  });
});

describe('눌러 가며 읽기 — 탐색 주소 · 폰 놓기 (도메인/작성 §3.6 「앱 화면」 「눌러 가며 읽기」)', () => {
  const 탐색 = { url: 'http://host.docker.internal:4723/wd/hub', app: 'http://files/app.apk' };

  it('서버가 준 팜 주소 · 앱 파일을 붙이고, 첫 화면을 못 읽었어도 붙인다', async () => {
    서버가({ screen: '화면 1x1 · 요소 0개', reason: null, appium: 탐색 });
    expect(await 앱화면받기(서버, 7, 자료)).toEqual({ 글: 앱화면파일(자료), 탐색 });

    서버가({ screen: null, reason: '디바이스 팜에 빈 폰이 없습니다', appium: 탐색 });
    expect(await 앱화면받기(서버, 7, 자료)).toEqual({ 못읽음: '디바이스 팜에 빈 폰이 없습니다', 탐색 });
  });

  it('옛 서버(칸 없음) · 팜 없음(null)이면 탐색이 없고 환경값도 없다', async () => {
    서버가({ screen: '화면 1x1 · 요소 0개', reason: null });
    const 옛것 = await 앱화면받기(서버, 7, 자료);
    서버가({ screen: null, reason: '디바이스 팜(DEVICE_FARM_URL)이 연결되어 있지 않다', appium: null });
    const 팜없음 = await 앱화면받기(서버, 7, 자료);

    expect(옛것).toEqual({ 글: 앱화면파일(자료) });
    expect(팜없음).toEqual({ 못읽음: '디바이스 팜(DEVICE_FARM_URL)이 연결되어 있지 않다' });
    expect(탐색환경(옛것)).toEqual({});
    expect(탐색환경(undefined)).toEqual({});
  });

  it('환경값은 appium-cli 가 읽는 이름이다 — 폰 번호는 안 준다', () => {
    expect(탐색환경({ 글: 'x', 탐색 })).toEqual({ PLATFORM_APPIUM_URL: 탐색.url, PLATFORM_APP: 탐색.app });
  });

  it('AI 가 잡은 폰이 작업 폴더에 남아 있으면 팜에서 놓는다', async () => {
    mkdirSync(join(자료, '.appium-cli'));
    writeFileSync(join(자료, '.appium-cli', 'held'), 'R3CR10TCVCD\n');
    const 부름 = vi.fn(async (_주소: string, _설정: RequestInit) => new Response('{"released":true}', { status: 200 }));

    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch);

    expect(부름).toHaveBeenCalledOnce();
    expect(부름.mock.calls[0]?.[0]).toBe('http://host.docker.internal:4723/api/devices/R3CR10TCVCD/hold');
    expect(부름.mock.calls[0]?.[1].method).toBe('DELETE');
  });

  it('놓은 뒤 기록을 지운다 — 이어하기가 같은 폴더로 다시 끝나도 두 번 놓지 않는다', async () => {
    mkdirSync(join(자료, '.appium-cli'));
    writeFileSync(join(자료, '.appium-cli', 'held'), 'R3CR10TCVCD');
    const 부름 = vi.fn(async () => new Response('', { status: 200 }));

    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch);
    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch);

    expect(부름).toHaveBeenCalledOnce();
    expect(existsSync(join(자료, '.appium-cli', 'held'))).toBe(false);
  });

  it('30분 넘은 기록은 놓지 않는다 — 팜이 이미 풀었고 그 폰을 지금 다른 실행이 잡았을 수 있다', async () => {
    mkdirSync(join(자료, '.appium-cli'));
    writeFileSync(join(자료, '.appium-cli', 'held'), 'R3CR10TCVCD');
    const 부름 = vi.fn(async () => new Response('', { status: 200 }));

    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch, Date.now() + 31 * 60_000);

    expect(부름).not.toHaveBeenCalled();
    expect(existsSync(join(자료, '.appium-cli', 'held'))).toBe(false);
  });

  it('기록이 링크이거나 폰 번호 꼴이 아니면 읽은 것을 싣지 않는다 — 자식이 쓴 파일이다', async () => {
    const 비밀 = join(자료, 'secret');
    writeFileSync(비밀, 'AUTHORING_AGENT_TOKEN=abc');
    mkdirSync(join(자료, '.appium-cli'));
    symlinkSync(비밀, join(자료, '.appium-cli', 'held'));
    const 부름 = vi.fn(async () => new Response('', { status: 200 }));

    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch);
    rmSync(join(자료, '.appium-cli', 'held'));
    writeFileSync(join(자료, '.appium-cli', 'held'), 'a/../../x?y');
    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch);

    expect(부름).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('abc');
  });

  it('팜이 실패 코드로 답하면 놓지 못했다고 적는다', async () => {
    mkdirSync(join(자료, '.appium-cli'));
    writeFileSync(join(자료, '.appium-cli', 'held'), 'R3CR10TCVCD');

    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch);

    expect(vi.mocked(console.error).mock.calls.at(-1)?.[0]).toContain('놓지 못했다: HTTP 500');
  });

  it('잡은 폰이 없거나 탐색이 없으면 팜을 부르지 않는다 · 팜에 못 닿아도 던지지 않는다', async () => {
    const 부름 = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await 잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch);
    mkdirSync(join(자료, '.appium-cli'));
    writeFileSync(join(자료, '.appium-cli', 'held'), 'R3CR10TCVCD');
    await 잡은폰놓기(자료, { 글: 'x' }, 7, 부름 as unknown as typeof fetch);
    expect(부름).not.toHaveBeenCalled();

    await expect(잡은폰놓기(자료, { 글: 'x', 탐색 }, 7, 부름 as unknown as typeof fetch)).resolves.toBeUndefined();
    expect(부름).toHaveBeenCalledOnce();
  });
});

describe('줄프롬프트 — 앱 화면 절 (도메인/작성 §3.6 「앱 화면」)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };
  const 부르기 = (앱화면?: Parameters<typeof 줄프롬프트>[12]) =>
    줄프롬프트(것, 'MKT', [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 앱화면);

  it('읽었으면 파일 경로와 지침 위치를 싣는다', () => {
    const 글 = 부르기({ 글: '/w/자료/app-screen.txt' });

    expect(글).toContain('--- 앱 화면 ---');
    expect(글).toContain('/w/자료/app-screen.txt');
    expect(글).toContain('.claude/skills/tpx-author/references/app.md');
    expect(글).toContain('기대값의 근거가 아니다');
  });

  it('못 읽었으면 까닭을 싣고 짐작하지 말라고 한다', () => {
    const 글 = 부르기({ 못읽음: '디바이스 팜(DEVICE_FARM_URL)이 연결되어 있지 않다' });

    expect(글).toContain('폰 화면을 읽지 못했다(디바이스 팜(DEVICE_FARM_URL)이 연결되어 있지 않다)');
    expect(글).toContain('짐작해 쓰지 말고');
  });

  it('탐색이 있으면 appium-cli 로 눌러 가며 읽으라고 하고 놓기를 당부한다 — 없으면 그 줄이 없다', () => {
    const 탐색 = { url: 'http://farm:4723/wd/hub', app: 'http://files/app.apk' };

    expect(부르기({ 글: '/w/a.txt', 탐색 })).toContain('npx appium-cli');
    expect(부르기({ 못읽음: '폰이 다른 실행에 쓰이는 중이다', 탐색 })).toContain('close · release');
    expect(부르기({ 글: '/w/a.txt' })).not.toContain('appium-cli');
  });

  it('없으면 절이 없다 — 앱 없는 서비스의 프롬프트는 그대로다', () => {
    expect(부르기()).not.toContain('--- 앱 화면 ---');
  });
});
