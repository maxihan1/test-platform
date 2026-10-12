import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 가입본문, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-264',
  name: '새 아이디로 회원가입을 부르면 201 로 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('새 아이디로 POST /api/auth/signup 을 부른다', async () => {
      const res = await request.post('/api/auth/signup', { data: 가입본문(정보) });
      await verify('새 아이디로 회원가입을 부르면 201 로 응답한다', res.status(), 201);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
