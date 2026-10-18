import { defineCase, test, verify } from '@platform/kit';
import { 새회원만들기, 회원정리, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-381',
  name: '아이디 중복 가입 요청은 409 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
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

    await test.step('이미 있는 아이디로 가입 요청을 보낸다', async () => {
      const 정보 = 준비.회원;
      const 응답 = await request.post('/api/auth/signup', {
        data: { loginId: 정보?.loginId, password: 정보?.password, passwordConfirm: 정보?.password, name: 정보?.name, email: 정보?.email, terms: true, privacy: true },
      });
      await verify('아이디 중복 가입 요청은 409 로 응답한다', 응답.status(), 409);
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
