import { defineCase, test, verify } from '@platform/kit';
import { 새회원정보, 회원정리 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-380',
  name: '새 아이디로 가입 요청을 하면 201 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();
  let 가입함 = false;

  try {
    await test.step('비회원 상태를 확인한다', async () => {
      const 응답 = await request.get('/api/session');
      await verify('세션에 회원이 없다', ((await 응답.json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('새 아이디로 POST /api/auth/signup 을 부른다', async () => {
      const 응답 = await request.post('/api/auth/signup', {
        data: { loginId: 정보.loginId, password: 정보.password, passwordConfirm: 정보.password, name: 정보.name, email: 정보.email, terms: true, privacy: true },
      });
      가입함 = 응답.status() === 201;
      await verify('새 아이디로 가입 요청을 하면 201 로 응답한다', 응답.status(), 201);
    });
  } finally {
    if (가입함) await 회원정리(request, 정보);
  }
});
