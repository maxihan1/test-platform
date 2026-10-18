import { defineCase, test, verify } from '@platform/kit';
import { 새회원만들기, 새회원정보, 회원정리, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-382',
  name: '아무도 쓰지 않는 아이디는 available 이 true 다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('이미 있는 아이디를 가입해 둔다', async () => {
      준비.회원 = await 새회원만들기(request);
    });

    await test.step('비회원 상태를 확인한다', async () => {
      const 응답 = await request.get('/api/session');
      await verify('세션에 회원이 없다', ((await 응답.json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('아무도 쓰지 않는 아이디로 GET /api/auth/check-id 를 부른다', async () => {
      const 응답 = await request.get('/api/auth/check-id', { params: { loginId: 새회원정보().loginId } });
      await verify('아무도 쓰지 않는 아이디는 available 이 true 다', ((await 응답.json()) as { available: boolean }).available, true);
    });

    await test.step('이미 있는 아이디로 check-id 를 부른다', async () => {
      const 응답 = await request.get('/api/auth/check-id', { params: { loginId: 준비.회원?.loginId ?? '' } });
      await verify('이미 있는 아이디는 available 이 false 다', ((await 응답.json()) as { available: boolean }).available, false);
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
