import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-282',
  name: '비회원이 댓글 작성을 부르면 401 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 POST /api/posts/{id}/comments 를 부른다', async () => {
    const res = await request.post('/api/posts/1/comments', { data: { content: '로그인 없이 보내는 댓글', parentId: null } });
    await verify('비회원이 댓글 작성을 부르면 401 로 응답한다', res.status(), 401);
  });
});
