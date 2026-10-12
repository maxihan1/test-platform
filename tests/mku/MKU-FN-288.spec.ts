import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-288',
  name: '실패 응답 본문에 code 와 message 가 있다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('로그인 없이 GET /api/auth/me 를 부른다', async () => {
    const res = await request.get('/api/auth/me');
    await verify('GET /api/auth/me 를 로그인 없이 부르면 실패 응답이 온다', res.ok(), false, { blocker: true });
    const 본문 = (await res.json()) as { code?: unknown; message?: unknown };
    await verify(
      '실패 응답 본문에 code 와 message 가 있다',
      { code: typeof 본문.code === 'string' && 본문.code !== '', message: typeof 본문.message === 'string' && 본문.message !== '' },
      { code: true, message: true },
    );
  });
});
