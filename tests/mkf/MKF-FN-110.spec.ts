import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-110',
  name: '답글이 달린 댓글을 삭제하면 그 자리에 「삭제된 댓글입니다」가 보인다',
  precondition: ['내 댓글에 답글이 달린 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 원댓글 = '지울 원댓글 내용';
  const 답글 = '남길 답글 내용';
  let 나!: 글쓴이;
  let 글번호 = 0;

  await 방해막기(page);
  try {
    await test.step('회원으로 로그인해 글을 쓰고 댓글에 답글을 하나 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
      const 댓글번호 = await 댓글달기(나.api, 글번호, 원댓글);
      await 댓글달기(나.api, 글번호, 답글, 댓글번호);
    });

    await test.step('내 댓글에 답글이 달린 글이 있는지 확인한다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글(답글).waitFor();
      await verify('내 댓글에 답글이 달린 글이 있다', (await 글있나(page.request, 글번호)) && (await 상세.댓글(원댓글).isVisible()), true, { blocker: true });
    });

    await test.step('내 댓글을 삭제한다', async () => {
      await 상세.댓글삭제버튼(원댓글).click();
      await 상세.댓글(원댓글).waitFor({ state: 'detached' });
      await verify('답글이 달린 댓글을 삭제하면 그 자리에 「삭제된 댓글입니다」가 보인다', await 상세.댓글('삭제된 댓글입니다').isVisible(), true);
    });

    await test.step('내 댓글을 삭제한 뒤 답글을 찾는다', async () => {
      await verify('답글이 달린 댓글을 삭제해도 답글은 그대로 보인다', await 상세.댓글(답글).isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
