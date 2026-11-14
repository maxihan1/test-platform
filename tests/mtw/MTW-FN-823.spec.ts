import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 팔로워전용글조각 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-823',
  name: '승인된 두 번째 사용자로 yuna_locked 프로필을 열면 팔로워 전용 글이 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 조각 = '';

  await test.step('두 번째 사용자로 로그인하고 yuna_locked 의 팔로워 전용 글을 API 로 찾는다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    조각 = await 팔로워전용글조각(page, 'yuna_locked');
    await verify('yuna_locked 의 팔로워 전용 글을 찾았다', 조각 !== '', true, { blocker: true });
  });

  await test.step('두 번째 사용자로 yuna_locked 프로필을 연다', async () => {
    await 프로필.열기('yuna_locked');
    const 보인다 = await 프로필.글(조각).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('승인된 두 번째 사용자로 yuna_locked 프로필을 열면 팔로워 전용 글이 보인다', 보인다, true);
  });
});
