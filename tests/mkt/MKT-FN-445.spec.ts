import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-445',
  name: '좋아요를 보내면 「liked」 true · 「likes」 1 로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '좋아요가 0인 내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(request, 정리);
      글번호 = (await 내글만들기(request, 정리)).id;
    });

    await test.step('내 글에 좋아요 POST 를 보낸다', async () => {
      const res = await request.post(`/api/posts/${글번호}/like`);
      await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
      await verify('좋아요를 보내면 「liked」 true · 「likes」 1 로 응답한다', await res.json(), { liked: true, likes: 1 });
    });

    await test.step('좋아요 POST 를 한 번 더 보낸다', async () => {
      const res = await request.post(`/api/posts/${글번호}/like`);
      await verify('한 번 더 보내면 「liked」 false · 「likes」 0 으로 응답한다', await res.json(), { liked: false, likes: 0 });
    });
  } finally {
    await 정리.비우기();
  }
});
