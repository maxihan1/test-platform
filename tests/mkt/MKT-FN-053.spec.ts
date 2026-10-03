import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-053',
  name: '회원정보 수정에 들어가면 비밀번호 확인 칸이 먼저 보이고 맞는 비밀번호를 적으면 수정 칸이 보인다',
  precondition: ['회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    shown: z.boolean().describe('보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 수정 = new 회원정보수정화면(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('회원정보 수정 화면을 연다', async () => {
    await 수정.열기();
    await verify('회원정보 수정에 들어가면 먼저 비밀번호 확인 칸이 보인다', await 수정.확인비밀번호칸.isVisible(), expected.shown);
  });

  await test.step('회원정보 수정 화면에서 맞는 비밀번호를 적고 확인한다', async () => {
    await 수정.비밀번호를확인한다(params.password ?? '');
    const 칸들 = [수정.이름칸, 수정.이메일칸, 수정.휴대폰칸, 수정.관심분야묶음];
    await verify('비밀번호가 맞으면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있는 칸이 보인다', (await Promise.all(칸들.map((칸) => 칸.isVisible()))).every(Boolean), expected.shown);
  });
});
