import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-177',
  name: '프로필에 「팔로워」 · 「팔로잉」 · 「게시물」 · 「가입」이 보인다',
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

  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필.열기('hana_photo');
    const 팔로워 = await verify('프로필에 「팔로워」가 보인다', await 프로필.통계('팔로워').isVisible(), true);
    const 팔로잉 = await verify('프로필에 「팔로잉」이 보인다', await 프로필.통계('팔로잉').isVisible(), true);
    const 게시물 = await verify('프로필에 「게시물」이 보인다', await 프로필.통계('게시물').isVisible(), true);
    const 가입 = await verify('프로필에 「가입」이 보인다', await 프로필.통계('가입').isVisible(), true);
    await verify('프로필에 「팔로워」 · 「팔로잉」 · 「게시물」 · 「가입」이 보인다', 팔로워 && 팔로잉 && 게시물 && 가입, true);
  });
});
