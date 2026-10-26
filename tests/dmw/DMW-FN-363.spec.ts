import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-363',
  name: '로그인 없이 좋아요 API 를 부르면 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글을 만들어 둔다', async () => {
      글번호 = (await 일회용회원의글만들기(page.request)).번호;
      await verify('이 요청은 로그인하지 않았다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('로그인 없이 POST /api/posts/{id}/like 를 부른다', async () => {
      const 응답 = await request.post(`/api/posts/${글번호}/like`);
      await verify('로그인 없이 좋아요 API 를 부르면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
