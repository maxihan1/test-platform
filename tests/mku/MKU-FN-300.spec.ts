import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-300',
  name: '로그인한 채 POST /api/auth/logout 을 보내면 204 로 응답한다',
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 새: 회원정보 | undefined;

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      새 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 새로 가입한 회원이다', (await 요청세션아이디(request)) === 새?.loginId, true, { blocker: true });
    });

    await test.step('POST /api/auth/logout 을 보낸다', async () => {
      const 응답 = await request.post('/api/auth/logout');
      await verify('로그인한 채 POST /api/auth/logout 을 보내면 204 로 응답한다', 응답.status(), 204);
    });
  } finally {
    if (새 !== undefined) await 가입자정리하기(request, 새);
  }
});
