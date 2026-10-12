import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-278',
  name: '비회원이 글 작성을 부르면 401 로 응답한다',
  precondition: ['비회원이다', '새로 가입한 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 나!: 글쓴이;
  let 글번호 = 0;

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('비회원으로 POST /api/posts 를 부른다', async () => {
      const res = await request.post('/api/posts', { data: { category: '자유', title: '비회원이 쓰는 글', content: '비회원이 쓰려는 글입니다. 열 글자를 넘깁니다', images: [] } });
      await verify('비회원이 글 작성을 부르면 401 로 응답한다', res.status(), 401);
    });

    await test.step('한 회원이 글을 쓰고 다른 새 회원으로 로그인한다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '남의글')).id;
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('새로 가입한 회원으로 로그인해 있고 남의 글이 있는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 요청세션아이디(나.api), 나.정보.loginId, { blocker: true });
      await verify('남의 글이 있다', await 글있나(나.api, 글번호), true, { blocker: true });
    });

    await test.step('남의 글로 PUT /api/posts/{id} 를 부른다', async () => {
      const res = await 나.api.put(`/api/posts/${String(글번호)}`, { data: { category: '자유', title: '남의 글 고치기', content: '남의 글을 고치려는 요청입니다', images: [] } });
      await verify('남의 글을 고치려고 부르면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('남의 글로 DELETE /api/posts/{id} 를 부른다', async () => {
      const res = await 나.api.delete(`/api/posts/${String(글번호)}`);
      await verify('남의 글을 지우려고 부르면 403 으로 응답한다', res.status(), 403);
    });
  } finally {
    await 정리.모두하기();
  }
});
