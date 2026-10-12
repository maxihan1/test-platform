import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-136',
  name: '댓글에는 「답글」 버튼이 보인다',
  precondition: ['댓글과 그 답글이 달린 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 원댓글 = '답글 버튼을 볼 댓글';
  const 답글 = '달려 있는 답글';
  let 글쓴!: 둘째회원;
  let 글번호 = 0;

  try {
    await test.step('회원이 글을 쓰고 댓글과 그 답글을 단다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '댓글글')).id;
      const 댓글번호 = await 댓글달기(글쓴.api, 글번호, 원댓글);
      await 댓글달기(글쓴.api, 글번호, 답글, 댓글번호);
    });

    await test.step('댓글과 그 답글이 달린 글이 있는지 확인한다', async () => {
      await verify('댓글과 그 답글이 달린 글이 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('그 글 상세를 연다', async () => {
      await 방해막기(page);
      await 상세.열기(글번호);
      await 상세.댓글(답글).waitFor();
      await verify('댓글에는 「답글」 버튼이 보인다', await 상세.댓글답글버튼(원댓글).isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
