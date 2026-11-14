import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-826',
  name: '차단한 계정 프로필을 열면 그 계정 글이 보이지 않는다',
  precondition: ['일반 회원이 troll_kim 을 차단해 두었다'],
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

  await test.step('troll_kim 프로필을 연다', async () => {
    await 프로필.열기('troll_kim');
    await verify('프로필 머리에 「차단 해제」 버튼이 보인다', await 프로필.팔로우버튼.innerText(), '차단 해제', { blocker: true });
    const 글이보인다 = await 프로필.글('').first().waitFor({ timeout: 8_000 }).then(() => true, () => false);
    await verify('차단한 계정 프로필을 열면 그 계정 글이 보이지 않는다', 글이보인다, false);
    await verify('차단한 계정 프로필에서는 팔로우할 수 없다', await 프로필.팔로우하기버튼.isVisible(), false);
  });
});
