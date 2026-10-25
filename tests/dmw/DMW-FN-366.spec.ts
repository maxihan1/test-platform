import { defineCase, test, verify } from '@platform/kit';

import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-366',
  name: '내 댓글을 PUT 으로 고치면 200 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 글번호 = 0;
  let 댓글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글에 댓글을 달아 둔다', async () => {
      글번호 = (await 일회용회원의글만들기(request)).번호;
      댓글번호 = await 댓글달기(request, 글번호, '고치기 전 내 댓글입니다');
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
    });

    await test.step('PUT /api/comments/{id} 로 내 댓글을 고친다', async () => {
      const 응답 = await request.put(`/api/comments/${댓글번호}`, { data: { content: '고친 뒤 내 댓글입니다' } });
      await verify('내 댓글을 PUT 으로 고치면 200 으로 응답한다', 응답.status(), 200);
    });

    await test.step('DELETE /api/comments/{id} 로 내 댓글을 지운다', async () => {
      const 응답 = await request.delete(`/api/comments/${댓글번호}`);
      await verify('내 댓글을 DELETE 로 지우면 204 로 응답한다', 응답.status(), 204);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
