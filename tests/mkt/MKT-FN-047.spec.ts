import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 비밀번호찾기화면 } from './pages/find-password.page.js';

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
  tcId: 'MKT-FN-047',
  name: '비밀번호 찾기에서 아이디와 이메일이 맞으면 보냈다는 안내가 보이고 틀리면 없다는 안내가 보인다',
  precondition: ['비회원이다', '이번 실행에서 가입한 회원이 있다'],
  params: null,
  expected: z.object({
    created: z.number().describe('가입 응답 코드').default(201),
    sent: z.string().describe('임시 비밀번호 발송 안내').default('가입하신 이메일로 임시 비밀번호를 보냈습니다'),
    notFound: z.string().describe('일치하는 회원 없음 안내').default('일치하는 회원 정보가 없습니다'),
  }),
});

test(spec, async ({ page, request, expected }) => {
  const 화면 = new 비밀번호찾기화면(page);
  const 아이디 = 새아이디();
  const 없는아이디 = 새아이디();

  try {
    await test.step('이번 실행에서 가입한 회원을 만든다', async () => {
      const 가입 = await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      await verify('이번 실행에서 가입한 회원이 있다', 가입.status(), expected.created, { blocker: true });
      await 화면.열기();
    });

    await test.step('비밀번호 찾기 화면에서 맞는 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 화면.제출한다(아이디, `${아이디}@example.com`);
      await verify('아이디와 이메일이 일치하면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다', await 화면.결과문구.innerText(), expected.sent);
    });

    await test.step('비밀번호 찾기 화면에서 없는 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 화면.제출한다(없는아이디, `${없는아이디}@example.com`);
      await verify('아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」가 보인다', await 화면.결과문구.innerText(), expected.notFound);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});
