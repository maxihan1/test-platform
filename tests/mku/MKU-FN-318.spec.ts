import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-318',
  name: '다른 회원 댓글을 DELETE 하려 하면 403 으로 응답한다',
  precondition: ['두 회원이 있고 한 회원이 댓글을 달았다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 나!: 글쓴이;
  let 댓글번호 = 0;

  try {
    await test.step('한 회원이 글과 댓글을 만들고 다른 회원으로 로그인한다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      const 글 = await 글하나쓰기(글쓴.api, '댓글글');
      댓글번호 = await 댓글달기(글쓴.api, 글.id, '다른 회원이 단 댓글');
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('두 회원이 있고 한 회원이 댓글을 달았는지 확인한다', async () => {
      await verify('두 회원이 있고 한 회원이 댓글을 달았다', (await 로그인해있나(글쓴.api)) && (await 로그인해있나(나.api)) && 댓글번호 > 0, true, { blocker: true });
    });

    await test.step('다른 회원으로 그 댓글을 DELETE /api/comments/{id} 로 지우려 한다', async () => {
      const res = await 나.api.delete(`/api/comments/${String(댓글번호)}`);
      await verify('다른 회원 댓글을 DELETE 하려 하면 403 으로 응답한다', res.status(), 403);
    });
  } finally {
    await 정리.모두하기();
  }
});
