import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-359',
  name: '게시글 상세 API 를 다시 부르면 조회수가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글을 만들어 둔다', async () => {
      글번호 = (await 일회용회원의글만들기(page.request)).번호;
    });

    await test.step('GET /api/posts/{id} 를 두 번 부른다', async () => {
      const 첫째 = await request.get(`/api/posts/${글번호}`);
      await verify('첫 응답 코드가 200이다', 첫째.status(), 200, { blocker: true });
      const 둘째 = await request.get(`/api/posts/${글번호}`);
      await verify('둘째 응답 코드가 200이다', 둘째.status(), 200, { blocker: true });
      const 처음 = ((await 첫째.json()) as { views: number }).views;
      const 다음 = ((await 둘째.json()) as { views: number }).views;
      await verify('게시글 상세 API 를 다시 부르면 조회수가 1 오른다', 다음 - 처음, 1);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
