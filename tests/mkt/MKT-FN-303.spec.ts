import { defineCase, test, verify } from '@platform/kit';

import { 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-303',
  name: '로그인 없이 댓글을 보내면 401 로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;

  try {
    await test.step('회원이 글을 하나 쓴다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '댓글글')).id;
    });

    await test.step('로그인하지 않은 요청인지 확인한다', async () => {
      await verify('로그인하지 않은 요청이다', !(await 로그인해있나(request)), true, { blocker: true });
    });

    await test.step('로그인 없이 POST /api/posts/{id}/comments 를 보낸다', async () => {
      const res = await request.post(`/api/posts/${String(글번호)}/comments`, { data: { content: '로그인 없이 보내는 댓글', parentId: null } });
      await verify('로그인 없이 댓글을 보내면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    await 정리.모두하기();
  }
});
