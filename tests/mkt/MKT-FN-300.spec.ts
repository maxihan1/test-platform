import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-300',
  name: '좋아요를 부르면 liked true 와 1 오른 likes 가 돌아온다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;
  let 글번호 = 0;
  let 처음좋아요수 = 0;

  try {
    await test.step('회원으로 로그인하고 다른 회원이 글을 쓴다', async () => {
      나 = await 임시회원으로로그인(request);
      정리.더하기(() => 글쓴이정리하기(나));
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      글번호 = (await 글하나쓰기(남.api, '좋아요글')).id;
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      처음좋아요수 = ((await (await request.get(`/api/posts/${String(글번호)}`)).json()) as { likes: number }).likes;
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(request), true, { blocker: true });
    });

    await test.step('다른 회원 글에 POST /api/posts/{id}/like 를 부른다', async () => {
      const 본문 = (await (await request.post(`/api/posts/${String(글번호)}/like`)).json()) as { liked: boolean; likes: number };
      await verify('좋아요를 부르면 liked true 와 1 오른 likes 가 돌아온다', 본문.liked && 본문.likes === 처음좋아요수 + 1, true);
    });

    await test.step('같은 글에 POST /api/posts/{id}/like 를 한 번 더 부른다', async () => {
      const 본문 = (await (await request.post(`/api/posts/${String(글번호)}/like`)).json()) as { liked: boolean };
      await verify('좋아요를 다시 부르면 liked false 가 돌아온다', 본문.liked, false);
    });
  } finally {
    await 정리.모두하기();
  }
});
