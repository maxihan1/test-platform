import { defineCase, test, verify } from '@platform/kit';

import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-367',
  name: '다른 회원의 댓글을 PUT 으로 고치면 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  let 글번호 = 0;
  let 댓글번호 = 0;

  try {
    await test.step('다른 일회용 회원이 올린 글에 댓글을 달아 두고 이 회원으로 로그인한다', async () => {
      글번호 = (await 일회용회원의글만들기(page.request)).번호;
      댓글번호 = await 댓글달기(page.request, 글번호, '남이 쓴 댓글입니다');
      await 요청로그인한일회용회원(request);
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
    });

    await test.step('다른 회원의 댓글을 PUT 으로 고친다', async () => {
      const 응답 = await request.put(`/api/comments/${댓글번호}`, { data: { content: '남이 고친 댓글입니다' } });
      await verify('다른 회원의 댓글을 PUT 으로 고치면 403 으로 응답한다', 응답.status(), 403);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
