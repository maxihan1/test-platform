import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-308',
  name: 'GET /api/posts/{id} 를 다시 부르면 조회수가 1 오른다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;

  try {
    await test.step('회원이 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '조회글')).id;
    });

    await test.step('글이 있고 로그인하지 않은 요청인지 확인한다', async () => {
      await verify('로그인하지 않은 요청이다', !(await 로그인해있나(request)), true, { blocker: true });
    });

    await test.step('GET /api/posts/{id} 를 두 번 부른다', async () => {
      const 처음 = (await (await request.get(`/api/posts/${String(글번호)}`)).json()) as { views: number };
      const 다시 = (await (await request.get(`/api/posts/${String(글번호)}`)).json()) as { views: number };
      await verify('GET /api/posts/{id} 를 다시 부르면 조회수가 1 오른다', 다시.views, 처음.views + 1);
    });
  } finally {
    await 정리.모두하기();
  }
});
