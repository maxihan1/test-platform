import { defineCase, test, verify } from '@platform/kit';

import { JSON인가 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-337',
  name: 'API 응답 본문은 JSON 이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/posts 를 부른다', async () => {
    const 응답 = await request.get('/api/posts');
    const 형식 = await verify('응답 Content-Type 이 JSON 이다', (응답.headers()['content-type'] ?? '').includes('application/json'), true);
    const 읽힘 = await verify('응답 본문을 JSON 으로 읽을 수 있다', JSON인가(await 응답.text()), true);
    await verify('API 응답 본문은 JSON 이다', 형식 && 읽힘, true);
  });
});
