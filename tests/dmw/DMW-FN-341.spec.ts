import { defineCase, test, verify } from '@platform/kit';

import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-341',
  name: '실패 응답의 message 는 한국어 문장이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('로그인 없이 GET /api/cart 를 불러 message 를 확인한다', async () => {
    const 응답 = await request.get('/api/cart');
    const 몸 = await 몸읽기<{ message?: string }>(응답);
    await verify('실패 응답의 message 는 한국어 문장이다', /[가-힣]/.test(몸.message ?? ''), true);
  });
});
