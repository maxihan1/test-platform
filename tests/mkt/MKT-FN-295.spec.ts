import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-295',
  name: '로그인 없이 GET /api/session 을 부르면 200 과 { "user": null } 이 돌아온다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/session 을 부른다', async () => {
    const 응답 = await request.get('/api/session');
    await verify('로그인 없이 GET /api/session 을 부르면 200 과 { "user": null } 이 돌아온다', { 상태: 응답.status(), 본문: await 응답.json() }, { 상태: 200, 본문: { user: null } });
  });
});
