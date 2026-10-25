import { defineCase, test, verify } from '@platform/kit';

import { 새창묶음 } from './helpers/common-tools.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 요청로그인한일회용회원, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-361',
  name: '다른 회원의 글을 PUT 으로 고치면 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  let 글번호 = 0;
  const 손님 = await 새창묶음(page);

  try {
    await test.step('다른 일회용 회원이 올린 글을 만들어 두고 이 회원으로 로그인한다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 요청로그인한일회용회원(request);
      const 보기 = (await (await request.get('/api/session')).json()) as { user: { id: number } | null };
      await verify('일회용 회원으로 로그인해 있다', 보기.user !== null, true, { blocker: true });
    });

    await test.step('다른 회원의 글을 PUT 으로 고친다', async () => {
      const 응답 = await request.put(`/api/posts/${글번호}`, { data: { category: '자유', title: '남이 고친 제목입니다', content: '남이 고친 본문입니다 열 글자가 넘습니다', images: [] } });
      await verify('다른 회원의 글을 PUT 으로 고치면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('다른 회원의 글을 DELETE 로 지운다', async () => {
      const 응답 = await request.delete(`/api/posts/${글번호}`);
      await verify('다른 회원의 글을 DELETE 로 지우면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('로그인 없이 POST /api/posts 를 부른다', async () => {
      const 응답 = await 손님.request.post('/api/posts', { data: { category: '자유', title: '손님이 쓴 제목입니다', content: '손님이 쓴 본문입니다 열 글자가 넘습니다', images: [] } });
      await verify('로그인 없이 글 만들기 API 를 부르면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await 손님.close();
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
