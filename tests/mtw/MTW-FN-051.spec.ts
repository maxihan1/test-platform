import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-051',
  name: '팔로우 요청이 없는 두 번째 사용자로 홈을 열면 오른쪽 메뉴에 「팔로우 요청」이 보이지 않는다',
  techniques: ['결정 테이블'],
  precondition: ['팔로우 요청이 와 있지 않다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('두 번째 사용자로 로그인한다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('두 번째 사용자로 홈을 연다', async () => {
    await 홈.열기();
    const 알림 = await 홈.메뉴.링크(/알림/).waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('오른쪽 메뉴 첫 구획이 그려진다', 알림, true, { blocker: true });
    await verify('팔로우 요청이 없는 두 번째 사용자로 홈을 열면 오른쪽 메뉴에 「팔로우 요청」이 보이지 않는다', await 홈.메뉴.링크('팔로우 요청').isVisible(), false);
  });
});
