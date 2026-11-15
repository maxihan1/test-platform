// 웹 공용 부품 검사 — 로그인 상태를 남기고 이어 쓰고, 끊겼으면 다시 로그인한다 (도메인/러너 §5.2 「웹 공용 부품」)
import { mkdtemp, readFile, readdir, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as 부품 from '../parts.js';
import { 로그인이어쓰기 } from './webParts.js';

type 쿠키 = { name: string; value: string; domain: string };
type 값 = { name: string; value: string };

/** 쿠키 · localStorage 를 기억하는 가짜 창 — 부른 차례를 적는다 */
function 가짜창(처음쿠키: 쿠키[] = []) {
  const 한일: string[] = [];
  let 쿠키들: 쿠키[] = [...처음쿠키];
  let 저장: 값[] = [];
  const page = {
    context: () => ({
      addCookies: async (넣을: 쿠키[]) => {
        한일.push('쿠키 넣기');
        쿠키들 = [...쿠키들.filter((c) => !넣을.some((n) => n.name === c.name)), ...넣을];
      },
      clearCookies: async (조건: { name: string }) => {
        한일.push(`쿠키 지우기 ${조건.name}`);
        쿠키들 = 쿠키들.filter((c) => c.name !== 조건.name);
      },
      storageState: async () => ({ cookies: 쿠키들, origins: [{ origin: 'https://qa.example', localStorage: 저장 }, { origin: 'https://widget.other', localStorage: [{ name: 'x', value: '1' }] }] }),
    }),
    goto: async (주소: string) => void 한일.push(`열기 ${주소}`),
    evaluate: async (_함수: unknown, 인자: 값[] | string[]) => {
      if (typeof 인자[0] === 'string') {
        저장 = 저장.filter((v) => !(인자 as string[]).includes(v.name));
        한일.push('저장 걷기');
      } else {
        저장 = [...저장, ...(인자 as 값[])];
        한일.push('저장 넣기');
      }
    },
  } as unknown as Page;
  return {
    page,
    한일,
    쿠키이름들: () => 쿠키들.map((c) => c.name),
    로그인됨: () => 쿠키들.some((c) => c.name === 'sid'),
    들어오기: (덧: { 저장?: 값[] } = {}) => {
      쿠키들 = [...쿠키들, { name: 'sid', value: '1', domain: 'qa.example' }, { name: 'ad', value: '9', domain: 'tracker.other' }];
      저장 = [...저장, ...(덧.저장 ?? [])];
    },
  };
}

describe('로그인이어쓰기', () => {
  let 임시: string;
  let 앞임시: string | undefined;
  const env = { PLATFORM_BASE_URL: 'https://qa.example/app' };

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

  const 설정 = (창: ReturnType<typeof 가짜창>, 덧: { 저장?: 값[]; 저장키?: string[] } = {}) => ({
    로그인: vi.fn(async () => void 창.들어오기(덧)),
    들어왔나: vi.fn(async () => 창.로그인됨()),
    ...(덧.저장키 ? { 저장키: 덧.저장키 } : {}),
  });
  const 남긴것 = async () => {
    const 폴더 = join(임시, 'platform-login');
    return JSON.parse(await readFile(join(폴더, (await readdir(폴더))[0]!), 'utf8')) as { cookies: 쿠키[]; 저장: 값[] };
  };

  it('처음에는 화면으로 로그인하고, 다음 창은 남긴 쿠키로 들어와 로그인을 건너뛴다', async () => {
    const 첫 = 가짜창();
    const 첫설정 = 설정(첫);
    await 로그인이어쓰기(첫.page, 'qa_user1', 'pw', 첫설정, env);
    expect(첫설정.로그인).toHaveBeenCalledTimes(1);
    expect(첫설정.들어왔나).not.toHaveBeenCalled();

    const 둘 = 가짜창();
    const 둘설정 = 설정(둘);
    await 로그인이어쓰기(둘.page, 'qa_user1', 'pw', 둘설정, env);
    expect(둘설정.로그인).not.toHaveBeenCalled();
    expect(둘.한일).toEqual(['쿠키 넣기']);
  });

  it('대상 서버의 쿠키와 고른 localStorage 키만 남긴다 — 다른 서버 쿠키 · 「안내 봤음」 같은 값은 다음 케이스로 안 넘긴다', async () => {
    const 첫 = 가짜창();
    const 값들 = [
      { name: 'token', value: 'abc' },
      { name: 'notice_seen', value: '1' },
    ];
    await 로그인이어쓰기(첫.page, 'qa_user1', 'pw', 설정(첫, { 저장: 값들, 저장키: ['token'] }), env);
    expect(await 남긴것()).toEqual({ cookies: [{ name: 'sid', value: '1', domain: 'qa.example' }], 저장: [{ name: 'token', value: 'abc' }] });

    const 둘 = 가짜창();
    await 로그인이어쓰기(둘.page, 'qa_user1', 'pw', 설정(둘, { 저장키: ['token'] }), env);
    expect(둘.한일).toEqual(['쿠키 넣기', '열기 https://qa.example', '저장 넣기']);
  });

  it('남긴 상태가 끊겼으면 넣은 것만 걷고 파일을 지운 뒤 다시 로그인한다 — 도우미가 넣어 둔 쿠키는 그대로다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 'pw', 설정(첫), env);
    const 둘 = 가짜창([{ name: 'cookie_ok', value: '1', domain: 'qa.example' }]);
    let 지운뒤파일수 = -1;
    const 로그인 = vi.fn(async () => {
      지운뒤파일수 = (await readdir(join(임시, 'platform-login'))).length;
      둘.들어오기();
    });
    await 로그인이어쓰기(둘.page, 'qa_user1', 'pw', { 로그인, 들어왔나: async () => false }, env);
    expect(둘.한일).toEqual(['쿠키 넣기', '쿠키 지우기 sid']);
    expect(둘.쿠키이름들()).toContain('cookie_ok');
    expect(지운뒤파일수).toBe(0);
    expect(로그인).toHaveBeenCalledTimes(1);
  });

  it('남긴 상태를 넣다 던져도 넣은 쿠키 · 저장 값을 걷고 화면으로 로그인한다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 'pw', 설정(첫, { 저장: [{ name: 'token', value: 'abc' }], 저장키: ['token'] }), env);
    const 둘 = 가짜창();
    const 조용히 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 로그인 = vi.fn(async () => void 둘.들어오기());
    await 로그인이어쓰기(둘.page, 'qa_user1', 'pw', { 로그인, 들어왔나: async () => Promise.reject(new Error('화면이 안 열린다')) }, env);
    expect(로그인).toHaveBeenCalledTimes(1);
    expect(조용히).toHaveBeenCalledWith('[kit] 남긴 로그인 상태를 넣지 못해 화면으로 로그인한다: 화면이 안 열린다');
    expect(둘.한일).toEqual(['쿠키 넣기', '열기 https://qa.example', '저장 넣기', '쿠키 지우기 sid', '저장 걷기']);
    조용히.mockRestore();
  });

  it('아이디 · 암호 · 대상 서버가 다르면 남의 상태를 안 쓰고, 30분이 지난 상태도 안 쓴다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 'pw', 설정(첫), env);

    for (const [아이디, 암호, 환경] of [
      ['qa_admin', 'pw', env],
      ['qa_user1', '틀린 암호', env],
      ['qa_user1', 'pw', { PLATFORM_BASE_URL: 'https://stage.example' }],
    ] as const) {
      const 창 = 가짜창();
      const 창설정 = 설정(창);
      await 로그인이어쓰기(창.page, 아이디, 암호, 창설정, 환경);
      expect(창설정.로그인).toHaveBeenCalledTimes(1);
      expect(창.한일).toEqual([]);
    }

    const 폴더 = join(임시, 'platform-login');
    const 옛 = new Date(Date.now() - 31 * 60_000);
    for (const 이름 of await readdir(폴더)) await utimes(join(폴더, 이름), 옛, 옛);
    const 늦은 = 가짜창();
    const 늦은설정 = 설정(늦은);
    await 로그인이어쓰기(늦은.page, 'qa_user1', 'pw', 늦은설정, env);
    expect(늦은설정.로그인).toHaveBeenCalledTimes(1);
    expect(늦은.한일).toEqual([]);
  });

  it('대상 서버 주소를 모르면 이어 쓰지 않고 화면으로 로그인만 한다', async () => {
    const 창 = 가짜창();
    const 창설정 = 설정(창);
    await 로그인이어쓰기(창.page, 'qa_user1', 'pw', 창설정, {});
    expect(창설정.로그인).toHaveBeenCalledTimes(1);
    await expect(readdir(join(임시, 'platform-login'))).rejects.toThrow();
  });

  it('세션이 든 파일은 나만 읽게 남긴다 — 암호는 파일 어디에도 없다', async () => {
    const 첫 = 가짜창();
    await 로그인이어쓰기(첫.page, 'qa_user1', 'secret-pw', 설정(첫), env);
    const 폴더 = join(임시, 'platform-login');
    const [이름] = await readdir(폴더);
    expect((await stat(join(폴더, 이름!))).mode & 0o777).toBe(0o600);
    expect((await stat(폴더)).mode & 0o777).toBe(0o700);
    expect(이름 + (await readFile(join(폴더, 이름!), 'utf8'))).not.toContain('secret-pw');
  });
});

describe('kit 공용 부품 입구', () => {
  it('내보내는 이름이 이 목록과 똑같다 — 도우미가 값으로 가져올 수 있는 유일한 입구라 판정 · 절차를 품은 것이 섞이면 안 된다', () => {
    // 새 부품을 더할 때 여기도 고친다. 그때 그 부품이 verify · test.step 을 부르지 않는지 본다 (공통/2-명세선언 「Page Object 파일」)
    expect(Object.keys(부품).sort()).toEqual(
      ['권한상태에서', '권한창답하기', '글자들', '길게누르기', '될때까지', '두번누르기', '뜰때까지', '로그인이어쓰기', '먼저뜨는것', '보이나', '사라질때까지', '스크롤해서찾기', '알림창열기', '앱다시켜기', '움직이는화면에서', '웹뷰에서', '칸에적기', '키보드완료', '토스트글'].sort(),
    );
  });
});
