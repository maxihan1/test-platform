import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

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

export const spec = defineCase({
  tcId: 'MKT-FN-043',
  name: '아이디나 비밀번호가 틀리면 어느 쪽이 틀렸는지 알리지 않고 같은 안내 문구가 보인다',
  precondition: ['비회원이다', '이번 실행에서 가입한 회원이 있다'],
  params: null,
  expected: z.object({
    created: z.number().describe('가입 응답 코드').default(201),
    message: z.string().describe('로그인 실패 문구').default('아이디 또는 비밀번호가 올바르지 않습니다'),
  }),
});

test(spec, async ({ page, request, expected }) => {
  const 화면 = new 로그인화면(page);
  const 아이디 = 새아이디();
  const 없는아이디 = 새아이디();

  try {
    await test.step('이번 실행에서 가입한 회원을 만든다', async () => {
      const 가입 = await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      await verify('이번 실행에서 가입한 회원이 있다', 가입.status(), expected.created, { blocker: true });
    });

    await test.step('로그인 화면에서 맞는 아이디와 틀린 비밀번호로 「로그인」을 누른다', async () => {
      await 화면.열기();
      await 화면.입력한다(아이디, '틀린!Pw1234');
      await 화면.로그인버튼.click();
      await 화면.로그인버튼.waitFor();
      await verify('비밀번호가 틀리면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 화면.오류문구.innerText(), expected.message);
    });

    await test.step('로그인 화면에서 없는 아이디로 「로그인」을 누른다', async () => {
      await 화면.입력한다(없는아이디, 예시비밀번호);
      await 화면.로그인버튼.click();
      await 화면.로그인버튼.waitFor();
      await verify('아이디가 틀려도 같은 「아이디 또는 비밀번호가 올바르지 않습니다」가 보이므로 어느 쪽이 틀렸는지 알려 주지 않는다', await 화면.오류문구.innerText(), expected.message);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});
