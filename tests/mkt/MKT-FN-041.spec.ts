import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 회원가입화면 } from './pages/signup.page.js';

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

async function 탈퇴로치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
  if (로그인.ok()) await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-041',
  name: '가입에 성공하면 가입 완료 화면에 환영 문구와 「로그인하러 가기」 버튼이 보인다',
  precondition: ['비회원이다', '가입에 쓸 새 아이디가 있다'],
  params: z.object({
    name: z.string().min(2).describe('가입 이름').default('마켓회원'),
  }),
  expected: z.object({
    shown: z.boolean().describe('보이는지').default(true),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 화면 = new 회원가입화면(page);
  const 아이디 = 새아이디();

  try {
    await test.step('회원가입 화면을 연다', async () => {
      await 화면.열기();
    });

    await test.step('회원가입 화면에서 필수 항목을 채우고 「가입하기」를 누른다', async () => {
      await 화면.필수입력을채운다({ 아이디, 비밀번호: 예시비밀번호, 이름: params.name, 이메일: `${아이디}@example.com` });
      await 화면.중복확인을한다();
      await 화면.필수약관에동의한다();
      await 화면.가입버튼.click();
      await 화면.로그인하러가기.waitFor();
      await verify('가입에 성공하면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」가 보인다', await 화면.환영제목.innerText(), `${params.name}님, 가입을 환영합니다`);
      await verify('가입 완료 화면에 「로그인하러 가기」 버튼이 보인다', await 화면.로그인하러가기.isVisible(), expected.shown);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});
