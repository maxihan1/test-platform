import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-390',
  name: '로그인한 채 session 을 부르면 user 에 현재 회원을 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('GET /api/session 을 부른다', async () => {
      const 응답 = await request.get('/api/session');
      const 사용자 = ((await 응답.json()) as { user: { loginId: string } | null }).user;
      await verify('로그인한 채 session 을 부르면 user 에 현재 회원을 준다', 사용자?.loginId, 준비.회원?.loginId);
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});
