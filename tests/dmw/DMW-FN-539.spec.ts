import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-539',
  name: 'POST /api/reset 은 204 로 응답한다',
  platforms: ['desktop', 'mobile'],
  held: '보류 — 서버 전체 자료를 처음으로 되돌려 같이 도는 케이스를 깨뜨린다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('POST /api/reset 을 부른다', async () => {
    const 응답 = await request.post('/api/reset');
    await verify('POST /api/reset 은 204 로 응답한다', 응답.status(), 204);
  });
});
