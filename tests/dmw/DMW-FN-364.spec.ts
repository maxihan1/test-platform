import { defineCase, test, verify } from '@platform/kit';

import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-364',
  name: '댓글 목록 API 는 200 과 댓글 목록으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  let 글번호 = 0;
  let 댓글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글에 댓글을 달아 둔다', async () => {
      글번호 = (await 일회용회원의글만들기(page.request)).번호;
      댓글번호 = await 댓글달기(page.request, 글번호, '목록에 보일 댓글입니다');
      await verify('이 요청은 로그인하지 않았다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('GET /api/posts/{id}/comments 를 부른다', async () => {
      const 응답 = await request.get(`/api/posts/${글번호}/comments`);
      const 상태 = await verify('응답 코드가 200이다', 응답.status(), 200);
      const 몸 = (await 응답.json()) as { items: { id: number }[] };
      const 목록 = await verify('댓글 목록에 방금 단 댓글이 있다', 몸.items.map((댓글) => 댓글.id), [댓글번호]);
      await verify('댓글 목록 API 는 200 과 댓글 목록으로 응답한다', 상태 && 목록, true);
    });

    await test.step('POST /api/posts/{id}/comments 로 댓글을 단다', async () => {
      const 응답 = await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: '새로 다는 댓글입니다' } });
      await verify('댓글 작성 API 는 201 로 응답한다', 응답.status(), 201);
    });

    await test.step('parentId 를 넣어 POST /api/posts/{id}/comments 를 부른다', async () => {
      const 응답 = await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: '답글로 다는 댓글입니다', parentId: 댓글번호 } });
      await verify('답글 작성 응답 코드가 201이다', 응답.status(), 201, { blocker: true });
      const 답글번호 = ((await 응답.json()) as { id: number }).id;
      const 목록 = (await (await request.get(`/api/posts/${글번호}/comments`)).json()) as { items: { id: number; parentId: number | null }[] };
      await verify('parentId 를 넣어 부르면 그 댓글의 답글로 달린다', 목록.items.find((댓글) => 댓글.id === 답글번호)?.parentId, 댓글번호);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
