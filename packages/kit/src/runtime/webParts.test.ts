// 웹 공용 부품 검사 — 로그인 상태를 남기고 이어 쓰고, 끊겼으면 다시 로그인한다 (도메인/러너 §5.2 「웹 공용 부품」)
import { mkdtemp, readdir, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as 부품 from '../parts.js';
import { 로그인이어쓰기 } from './webParts.js';

/** 쿠키 · localStorage 를 기억하는 가짜 창 — 부른 차례를 적는다 */
function 가짜창() {
  const 한일: string[] = [];
  let 쿠키: { name: string; value: string }[] = [];
  let 저장: { name: string; value: string }[] = [];
  const page = {
    context: () => ({
      addCookies: async (넣을: typeof 쿠키) => {
        한일.push('쿠키 넣기');
        쿠키 = [...넣을];
      },
      clearCookies: async () => {
        한일.push('쿠키 지우기');
        쿠키 = [];
      },
      storageState: async () => ({ cookies: 쿠키, origins: 저장.length === 0 ? [] : [{ origin: 'https://qa.example', localStorage: 저장 }] }),
    }),
    goto: async (주소: string) => void 한일.push(`열기 ${주소}`),
    evaluate: async (_함수: unknown, 값들?: typeof 저장) => {
      if (값들 === undefined) 저장 = [];
      else 저장 = [...값들];
      한일.push(값들 === undefined ? '저장 비우기' : '저장 넣기');
    },
  } as unknown as Page;
  return { page, 한일, 로그인됨: () => 쿠키.length > 0, 들어오기: (토큰?: string) => ((쿠키 = [{ name: 'sid', value: '1' }]), (저장 = 토큰 === undefined ? [] : [{ name: 'token', value: 토큰 }])) };
}

describe('로그인이어쓰기', () => {
  let 임시: string;
  let 앞임시: string | undefined;
  const env = { PLATFORM_BASE_URL: 'https://qa.example' };

  beforeEach(async () => {
    임시 = await mkdtemp(join(tmpdir(), 'login-reuse-'));
    앞임시 = process.env.TMPDIR;
    process.env.TMPDIR = 임시;
  });
  afterEach(async () => {
    if (앞임시 === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = 앞임시;
    await rm(임시, { recursive: true, force: true });
  });

  const 설정 = (창: ReturnType<typeof 가짜창>, 토큰?: string) => {
    const 로그인 = vi.fn(async () => void 창.들어오기(토큰));
    const 들어왔나 = vi.fn(async () => 창.로그인됨());
    return { 로그인, 들어왔나 };
  };

  it('처음에는 화면으로 로그인하고, 다음 창은 남긴 쿠키로 들어와 로그인을 건너뛴다', async () => {
    const 첫 = 가짜창();
    const 첫설정 = 설정(첫);
    await 로그인이어쓰기(첫.page, 'qa_user1', 첫설정, env);
    expect(첫설정.로그인).toHaveBeenCalledTimes(1);
    expect(첫설정.들어왔나).not.toHaveBeenCalled();

    const 둘 = 가짜창();
    const 둘설정 = 설정(둘);
    await 로그인이어쓰기(둘.page, 'qa_user1', 둘설정, env);
    expect(둘설정.로그인).not.toHaveBeenCalled();
    expect(둘.한일).toEqual(['쿠키 넣기']);
  });

  it('localStorage 에 든 로그인 값은 그 출처를 연 뒤 넣는다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 설정(첫, 'abc'), env);
    const 둘 = 가짜창();
    const 둘설정 = 설정(둘);
    await 로그인이어쓰기(둘.page, 'qa_user1', 둘설정, env);
    expect(둘.한일).toEqual(['쿠키 넣기', '열기 https://qa.example', '저장 넣기']);
    expect(둘설정.로그인).not.toHaveBeenCalled();
  });

  it('남긴 상태가 끊겼으면 지우고 다시 로그인한다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 설정(첫), env);
    const 둘 = 가짜창();
    const 로그인 = vi.fn(async () => void 둘.들어오기());
    await 로그인이어쓰기(둘.page, 'qa_user1', { 로그인, 들어왔나: async () => false }, env);
    expect(둘.한일).toEqual(['쿠키 넣기', '쿠키 지우기', '저장 비우기']);
    expect(로그인).toHaveBeenCalledTimes(1);
  });

  it('계정 · 대상 서버가 다르면 남의 상태를 안 쓰고, 30분이 지난 상태도 안 쓴다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 설정(첫), env);

    for (const [열쇠, 환경] of [
      ['qa_admin', env],
      ['qa_user1', { PLATFORM_BASE_URL: 'https://stage.example' }],
    ] as const) {
      const 창 = 가짜창();
      const 창설정 = 설정(창);
      await 로그인이어쓰기(창.page, 열쇠, 창설정, 환경);
      expect(창설정.로그인).toHaveBeenCalledTimes(1);
    }

    const 폴더 = join(임시, 'platform-login');
    const 옛 = new Date(Date.now() - 31 * 60_000);
    for (const 이름 of await readdir(폴더)) await utimes(join(폴더, 이름), 옛, 옛);
    const 늦은 = 가짜창();
    const 늦은설정 = 설정(늦은);
    await 로그인이어쓰기(늦은.page, 'qa_user1', 늦은설정, env);
    expect(늦은설정.로그인).toHaveBeenCalledTimes(1);
    expect(늦은.한일).toEqual([]);
  });

  it('세션이 든 파일은 나만 읽게 남긴다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 설정(첫), env);
    const 폴더 = join(임시, 'platform-login');
    const [이름] = await readdir(폴더);
    expect((await stat(join(폴더, 이름!))).mode & 0o777).toBe(0o600);
    expect((await stat(폴더)).mode & 0o777).toBe(0o700);
  });
});

describe('kit 공용 부품 입구', () => {
  it('판정 · 절차 · 선언을 내보내지 않는다 — 도우미가 값으로 가져올 수 있는 유일한 입구다', () => {
    for (const 이름 of ['verify', 'test', 'defineCase']) expect(Object.keys(부품)).not.toContain(이름);
    expect(Object.keys(부품)).toEqual(expect.arrayContaining(['로그인이어쓰기', '먼저뜨는것', '뜰때까지', '움직이는화면에서']));
  });
});
