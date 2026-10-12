import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-277',
  name: '게시글 상세를 다시 부르면 조회수가 1 오른다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/posts/1 을 두 번 부른다', async () => {
    const 처음 = (await (await request.get('/api/posts/1')).json()) as { views: number };
    const 다시 = (await (await request.get('/api/posts/1')).json()) as { views: number };
    await verify('게시글 상세를 다시 부르면 조회수가 1 오른다', 다시.views, 처음.views + 1);
  });
});
