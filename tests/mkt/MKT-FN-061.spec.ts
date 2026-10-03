import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

function 가입본문(아이디: string, 이름: string) {
  return {
    loginId: 아이디,
    password: 예시비밀번호,
    passwordConfirm: 예시비밀번호,
    name: 이름,
    email: `${아이디}@example.com`,
    phone: '',
    birth: '',
    gender: '선택 안 함',
    interests: [],
    terms: true,
    privacy: true,
    marketing: false,
  };
}

async function 탈퇴로치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
  if (로그인.ok()) await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-061',
  name: '회원 API 로 가입 · 아이디 확인 · 로그인 · 로그아웃 · 내 정보 조회가 기획서의 응답을 준다',
  precondition: [
    '비회원이다',
    '가입에 쓸 새 아이디가 있다',
    '이번 실행에서 가입한 회원이 있다',
    '로그인할 수 있는 회원 계정이 있다',
    '회원 계정으로 로그인해 있다',
  ],
  params: null,
  expected: z.object({
    created: z.number().describe('가입 응답 코드').default(201),
    conflict: z.string().describe('중복 가입 응답 코드와 코드명').default('409 CONFLICT'),
    available: z.string().describe('없는 아이디 확인 응답').default('{"available":true}'),
    taken: z.string().describe('있는 아이디 확인 응답').default('{"available":false}'),
    loginStatus: z.number().describe('로그인 응답 코드').default(200),
    wrongStatus: z.number().describe('틀린 비밀번호 응답 코드').default(401),
    logoutStatus: z.number().describe('로그아웃 응답 코드').default(204),
    anonymousStatus: z.number().describe('비로그인 내 정보 응답 코드').default(401),
  }),
});

test(spec, async ({ page, request, expected }) => {
  const 아이디 = 새아이디();
  const 없는아이디 = 새아이디();
  const 브라우저 = page.context().browser();
  if (!브라우저) throw new Error('브라우저를 얻지 못했습니다');
  const 비회원문맥 = await 브라우저.newContext({ baseURL: process.env.PLATFORM_BASE_URL });

  try {
    await test.step('POST /api/auth/signup 으로 가입 정보를 보낸다', async () => {
      const 응답 = await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      await verify('POST /api/auth/signup 으로 가입하면 201 이 온다', 응답.status(), expected.created);
    });

    await test.step('같은 아이디로 POST /api/auth/signup 을 다시 부른다', async () => {
      const 응답 = await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      const 본문 = (await 응답.json()) as { code?: string };
      await verify('이미 있는 아이디로 POST /api/auth/signup 을 부르면 409 CONFLICT 가 온다', `${응답.status()} ${본문.code}`, expected.conflict);
    });

    await test.step('없는 아이디로 GET /api/auth/check-id 를 부른다', async () => {
      const 응답 = await request.get(`/api/auth/check-id?loginId=${없는아이디}`);
      await verify('GET /api/auth/check-id 는 없는 아이디에 {"available":true} 를 준다', JSON.stringify(await 응답.json()), expected.available);
    });

    await test.step('이미 있는 아이디로 GET /api/auth/check-id 를 부른다', async () => {
      const 응답 = await request.get(`/api/auth/check-id?loginId=${아이디}`);
      await verify('GET /api/auth/check-id 는 이미 있는 아이디에 {"available":false} 를 준다', JSON.stringify(await 응답.json()), expected.taken);
    });

    await test.step('POST /api/auth/login 으로 맞는 아이디와 비밀번호를 보낸다', async () => {
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
      await verify('POST /api/auth/login 으로 로그인하면 200 이 온다', 응답.status(), expected.loginStatus, { blocker: true });
    });

    await test.step('GET /api/auth/me 를 부른다', async () => {
      const 로그인한 = await request.get('/api/auth/me');
      const 본문 = (await 로그인한.json()) as { loginId?: string };
      await verify('로그인한 뒤 GET /api/auth/me 를 부르면 현재 회원이 온다', 본문.loginId, 아이디);
      const 비회원 = await 비회원문맥.request.get('/api/auth/me');
      await verify('비로그인으로 GET /api/auth/me 를 부르면 401 이 온다', 비회원.status(), expected.anonymousStatus);
    });

    await test.step('POST /api/auth/login 으로 틀린 비밀번호를 보낸다', async () => {
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: '틀린!Pw1234', remember: false } });
      await verify('POST /api/auth/login 에 틀린 비밀번호를 보내면 401 이 온다', 응답.status(), expected.wrongStatus);
    });

    await test.step('POST /api/auth/logout 을 부른다', async () => {
      const 응답 = await request.post('/api/auth/logout');
      await verify('POST /api/auth/logout 은 204 로 응답한다', 응답.status(), expected.logoutStatus);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
    await 비회원문맥.close();
  }
});
