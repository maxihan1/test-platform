import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-178',
  name: '자기소개가 없는 qa_admin 프로필에 「제공된 설명이 없습니다.」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  await test.step('qa_admin 프로필을 연다', async () => {
    await 프로필.열기('qa_admin');
    const 보인다 = await 프로필.소개없음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('자기소개가 없는 qa_admin 프로필에 「제공된 설명이 없습니다.」가 보인다', 보인다, true);
  });
});
