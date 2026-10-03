import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';

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

async function 잠금을푼다(관리자: APIRequestContext, 아이디: string): Promise<void> {
  const 목록 = await 관리자.get('/api/admin/users');
  const { items } = (await 목록.json()) as { items: { id: number; loginId: string }[] };
  const 대상 = items.find((회원) => 회원.loginId === 아이디);
  if (대상) await 관리자.post(`/api/admin/users/${대상.id}/unlock`);
}

export const spec = defineCase({
  tcId: 'MKT-FN-044',
  name: '같은 아이디로 비밀번호를 5번 연속 틀리면 잠기고 로그인에 성공하면 실패 횟수가 0으로 돌아간다',
  precondition: ['비회원이다', '이번 실행에서 가입한 회원이 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    created: z.string().describe('가입 응답 코드 둘').default('201, 201'),
    lockMessage: z.string().describe('잠금 안내 문구').default('로그인 5회 실패로 10분간 로그인할 수 없습니다'),
    failMessage: z.string().describe('로그인 실패 문구').default('아이디 또는 비밀번호가 올바르지 않습니다'),
  }),
});

const 틀린비밀번호 = '틀린!Pw1234';

async function 틀린비밀번호로누른다(화면: 로그인화면, 아이디: string, 횟수: number): Promise<void> {
  for (let 번 = 0; 번 < 횟수; 번 += 1) {
    await 화면.입력한다(아이디, 틀린비밀번호);
    await 화면.로그인버튼.click();
    await 화면.로그인버튼.waitFor();
  }
}

test(spec, async ({ page, request, params, expected }) => {
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 잠글회원 = 새아이디();
  const 되돌릴회원 = 새아이디();
  const 브라우저 = page.context().browser();
  if (!브라우저) throw new Error('브라우저를 얻지 못했습니다');
  const 관리자문맥 = await 브라우저.newContext({ baseURL: process.env.PLATFORM_BASE_URL });

  try {
    await test.step('이번 실행에서 가입한 회원을 만든다', async () => {
      const 가입들 = [
        await request.post('/api/auth/signup', { data: 가입본문(잠글회원, '마켓회원') }),
        await request.post('/api/auth/signup', { data: 가입본문(되돌릴회원, '마켓회원') }),
      ];
      await verify('이번 실행에서 가입한 회원이 있다', 가입들.map((응답) => 응답.status()).join(', '), expected.created, { blocker: true });
    });

    await test.step('같은 아이디로 틀린 비밀번호를 5번 연속 입력한다', async () => {
      await 화면.열기();
      await 틀린비밀번호로누른다(화면, 잠글회원, 5);
      await verify('같은 아이디로 5번 연속 비밀번호를 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다', await 화면.오류문구.innerText(), expected.lockMessage);
    });

    await test.step('틀린 비밀번호를 4번 입력하고 맞는 비밀번호로 로그인한 뒤 다시 틀린 비밀번호를 4번 입력한다', async () => {
      await 화면.열기();
      await 틀린비밀번호로누른다(화면, 되돌릴회원, 4);
      await 화면.입력한다(되돌릴회원, 예시비밀번호);
      await 화면.로그인버튼.click();
      await 머리.로그아웃.waitFor();
      await page.request.post('/api/auth/logout');
      await 화면.열기();
      await 틀린비밀번호로누른다(화면, 되돌릴회원, 4);
      await verify('로그인에 성공하면 실패 횟수가 0으로 돌아가 이어서 4번 틀려도 잠기지 않는다', await 화면.오류문구.innerText(), expected.failMessage);
    });
  } finally {
    await 관리자문맥.request.post('/api/auth/login', { data: { loginId: params.adminId, password: params.adminPassword ?? '', remember: false } });
    await 잠금을푼다(관리자문맥.request, 잠글회원);
    await 탈퇴로치운다(request, 잠글회원);
    await 탈퇴로치운다(request, 되돌릴회원);
    await 관리자문맥.close();
  }
});
