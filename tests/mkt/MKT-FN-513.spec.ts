import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 가짜알림응답걸기, 나타났나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-513',
  name: '10초가 지나면 알림 수를 다시 가져와 종 옆 숫자가 「3」으로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['알림 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  let 걷기: (() => Promise<void>) | undefined;

  try {
    await test.step('알림 응답을 가짜로 걸고 홈 화면을 연다', async () => {
      await 방해창막기(page);
      await page.clock.install();
      걷기 = await 가짜알림응답걸기(page, [0, 3]);
      const 상태 = await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
      await verify('로그인 응답 코드가 200 이다', 상태, 200, { blocker: true });
      await 홈.열기();
      await 홈.머리글.로그인꼴일때까지();
      await verify('회원 머리글에 알림 종 아이콘이 보인다', await 홈.머리글.알림종.isVisible(), true, { blocker: true });
      await verify('종 옆 알림 수가 보이지 않는다', await 홈.머리글.알림수.isVisible(), false, { blocker: true });
    });

    await test.step('홈 화면을 열고 10초를 보낸다', async () => {
      await page.clock.runFor(10000);
      await verify('10초가 지나면 알림 수를 다시 가져와 종 옆 숫자가 「3」으로 바뀐다', await 나타났나(홈.머리글.알림수.filter({ hasText: '3' })), true);
    });
  } finally {
    if (걷기) await 걷기();
  }
});
