import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 로그인폼 } from './components/login-form.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

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
  tcId: 'MKT-FN-052',
  name: '남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다',
  precondition: ['이번 실행에서 가입한 회원이 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    ready: z.boolean().describe('남의 주문 번호를 찾았는지').default(true),
    message: z.string().describe('권한 없음 안내').default('권한이 없습니다'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 상세 = new 주문상세화면(page);
  const 회원 = 새아이디();
  const 브라우저 = page.context().browser();
  if (!브라우저) throw new Error('브라우저를 얻지 못했습니다');
  const 남의문맥 = await 브라우저.newContext({ baseURL: process.env.PLATFORM_BASE_URL });
  let 남의주문 = '';

  try {
    await test.step('이번 실행에서 가입한 회원이 로그인한다', async () => {
      await request.post('/api/auth/signup', { data: 가입본문(회원, '마켓회원') });
      await new 로그인폼(page).로그인한다(회원, 예시비밀번호);
      await 남의문맥.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '', remember: false } });
      const 목록 = await 남의문맥.request.get('/api/orders?period=all');
      남의주문 = ((await 목록.json()) as { items: { id: string }[] }).items[0]?.id ?? '';
      await verify('이번 실행에서 가입한 회원이 로그인해 있다', 남의주문 !== '', expected.ready, { blocker: true });
    });

    await test.step('다른 회원의 주문 번호로 주문 상세 주소를 연다', async () => {
      await 상세.열기(남의주문);
      await verify('남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다', await 상세.안내제목.innerText(), expected.message);
    });
  } finally {
    await 탈퇴로치운다(request, 회원);
    await 남의문맥.close();
  }
});
