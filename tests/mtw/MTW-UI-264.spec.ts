import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필편집사용자명칸 } from './pages/profile-edit-username.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-264',
  name: '프로필 편집 화면에 사용자명을 바꾸는 칸이 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 편집 = new 프로필편집화면(page);
  const 칸 = new 프로필편집사용자명칸(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('프로필 편집 화면을 연다', async () => {
    await 편집.열기();
    await verify('프로필 편집 화면에 사용자명을 바꾸는 칸이 없다', await 칸.사용자명칸.isVisible(), false);
  });
});
