import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-299',
  name: '다른 회원 글을 PUT 으로 고치려 하면 403 으로 응답한다',
  precondition: ['회원으로 로그인한 요청이다', '로그인하지 않은 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('다른 회원 글 /api/posts/1 에 PUT 을 보낸다', async () => {
      const res = await page.request.put('/api/posts/1', { data: { category: '자유', title: '남의 글 고치기', content: '남의 글을 고치려는 요청입니다', images: [] } });
      await verify('다른 회원 글을 PUT 으로 고치려 하면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('다른 회원 글 /api/posts/1 에 DELETE 를 보낸다', async () => {
      const res = await page.request.delete('/api/posts/1');
      await verify('다른 회원 글을 DELETE 하려 하면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('로그인 없이 POST /api/posts 를 보낸다', async () => {
      const res = await request.post('/api/posts', { data: { category: '자유', title: '로그인 없는 글', content: '로그인 없이 보내는 글입니다', images: [] } });
      await verify('로그인 없이 POST /api/posts 를 보내면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    await 정리.모두하기();
  }
});
