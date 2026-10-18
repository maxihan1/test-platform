import { defineCase, test, verify } from '@platform/kit';
import { 로그인요청, 새회원만들기, 회원정리, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-383',
  name: '맞는 아이디 · 비밀번호로 로그인 요청을 하면 200 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      준비.회원 = await 새회원만들기(request);
    });

    await test.step('가입한 회원이 있는지 확인한다', async () => {
      const 응답 = await request.get('/api/auth/check-id', { params: { loginId: 준비.회원?.loginId ?? '' } });
      await verify('가입한 아이디는 사용할 수 없다', ((await 응답.json()) as { available: boolean }).available, false, { blocker: true });
    });

    await test.step('맞는 아이디 · 비밀번호로 POST /api/auth/login 을 부른다', async () => {
      await verify('맞는 아이디 · 비밀번호로 로그인 요청을 하면 200 으로 응답한다', await 로그인요청(request, 준비.회원?.loginId ?? '', 준비.회원?.password ?? ''), 200);
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
