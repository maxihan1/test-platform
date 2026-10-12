import { defineCase, test, verify } from '@platform/kit';

import { 로그인해있나 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-310',
  name: '로그인 없이 POST /api/posts 를 보내면 401 로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인하지 않은 요청이다', !(await 로그인해있나(request)), true, { blocker: true });
  });

  await test.step('로그인 없이 POST /api/posts 를 보낸다', async () => {
    const res = await request.post('/api/posts', { data: { category: '자유', title: '로그인 없는 글', content: '로그인 없이 보내는 글입니다', images: [] } });
    await verify('로그인 없이 POST /api/posts 를 보내면 401 로 응답한다', res.status(), 401);
  });
});
