import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-015',
  name: '연합 관리 권한이 없는 사용자가 설정 화면을 열면 사이드바에 「릴레이」가 보이지 않는다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);

  await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.userId, params.userPassword);
    await 프로필.열기();
    await verify('역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「공개 프로필」 설정 화면을 연다', async () => {
    await 프로필.열기();
    await verify('연합 관리 권한이 없는 사용자가 설정 화면을 열면 사이드바에 「릴레이」가 보이지 않는다', await 프로필.사이드바.메뉴('릴레이').isVisible(), false);
  });
});
