import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-362',
  name: '좋아요 API 를 부르면 「liked」 true 와 1 오른 「likes」로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 글번호 = 0;
  let 처음 = 0;

  try {
    await test.step('일회용 회원이 올린 글을 만들어 둔다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      처음 = ((await (await request.get(`/api/posts/${글번호}`)).json()) as { likes: number }).likes;
      await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
    });

    await test.step('POST /api/posts/{id}/like 를 부른다', async () => {
      const 응답 = await request.post(`/api/posts/${글번호}/like`);
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 몸 = (await 응답.json()) as { liked: boolean; likes: number };
      const 눌림 = await verify('「liked」가 true 다', 몸.liked, true);
      const 수 = await verify('「likes」가 누르기 전보다 1 크다', 몸.likes - 처음, 1);
      await verify('좋아요 API 를 부르면 「liked」 true 와 1 오른 「likes」로 응답한다', 눌림 && 수, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
