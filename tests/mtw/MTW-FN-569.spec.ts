import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 팔로우목록화면 } from './pages/follow-list.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-569',
  name: '팔로워가 없는 계정의 팔로워 목록을 열면 「아직 아무도 이 사용자를 팔로우하고 있지 않습니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 팔로우목록화면(page);
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  await test.step('팔로워가 없는 spam_shop 의 팔로워 목록을 연다', async () => {
    await 목록.팔로워열기('spam_shop');
    const 보인다 = await 목록.글('아직 아무도 이 사용자를 팔로우하고 있지 않습니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('팔로워가 없는 계정의 팔로워 목록을 열면 「아직 아무도 이 사용자를 팔로우하고 있지 않습니다.」가 보인다', 보인다, true);
  });

  await test.step('팔로우한 계정이 없는 news_bot 의 팔로잉 목록을 연다', async () => {
    await 목록.팔로잉열기('news_bot');
    const 보인다 = await 목록.글('이 사용자는 아직 아무도 팔로우하고 있지 않습니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('팔로우한 계정이 없는 계정의 팔로잉 목록에는 「이 사용자는 아직 아무도 팔로우하고 있지 않습니다.」가 보인다', 보인다, true);
  });
});
