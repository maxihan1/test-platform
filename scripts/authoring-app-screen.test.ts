// 앱 첫 화면 받아 두기 검사 — 파일로 남기고 · 앱 없는 서비스는 아무것도 안 바꾸고 · 못 읽어도 작성은 가고 · 프롬프트 절을 싣는다
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 앱화면받기, 앱화면파일 } from './authoring-app-screen.js';
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
    const 글 = 부르기({ 못읽음: '내 컴퓨터 러너(LOCAL_RUNNER_URL)가 꺼져 있다' });

    expect(글).toContain('폰 화면을 읽지 못했다(내 컴퓨터 러너(LOCAL_RUNNER_URL)가 꺼져 있다)');
    expect(글).toContain('짐작해 쓰지 말고');
  });

  it('없으면 절이 없다 — 앱 없는 서비스의 프롬프트는 그대로다', () => {
    expect(부르기()).not.toContain('--- 앱 화면 ---');
  });
});
