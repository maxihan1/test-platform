import { defineCase, test, verify } from '@platform/kit';

import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-357',
  name: '로그인 없이 GET /api/session 을 부르면 401 이 아니라 200 과 「user」 null 로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('로그인 없이 GET /api/session 을 부른다', async () => {
    const 응답 = await request.get('/api/session');
    const 상태 = await verify('상태 코드가 200 이다', 응답.status(), 200);
    const 사용자 = await verify('「user」가 null 이다', (await 몸읽기<{ user?: unknown }>(응답)).user, null);
    await verify('로그인 없이 GET /api/session 을 부르면 401 이 아니라 200 과 「user」 null 로 응답한다', 상태 && 사용자, true);
  });
});
