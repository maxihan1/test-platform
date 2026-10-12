import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-311',
  name: '다른 회원 글을 PUT 으로 고치려 하면 403 으로 응답한다',
  precondition: ['두 회원이 있고 한 회원이 글을 썼다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 나!: 글쓴이;
  let 글번호 = 0;

  try {
    await test.step('한 회원이 글을 쓰고 다른 회원으로 로그인한다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '남의글')).id;
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('두 회원이 있고 한 회원이 글을 썼는지 확인한다', async () => {
      await verify('두 회원이 있고 한 회원이 글을 썼다', (await 로그인해있나(글쓴.api)) && (await 로그인해있나(나.api)) && (await 글있나(나.api, 글번호)), true, { blocker: true });
    });

    await test.step('다른 회원으로 그 글을 PUT /api/posts/{id} 로 고치려 한다', async () => {
      const res = await 나.api.put(`/api/posts/${String(글번호)}`, { data: { category: '자유', title: '남의 글 고치기', content: '남의 글을 고치려는 요청입니다', images: [] } });
      await verify('다른 회원 글을 PUT 으로 고치려 하면 403 으로 응답한다', res.status(), 403);
    });
  } finally {
    await 정리.모두하기();
  }
});
