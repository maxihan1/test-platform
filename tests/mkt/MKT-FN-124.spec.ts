import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-124',
  name: '답글이 없는 댓글을 지우면 목록에서 그 댓글이 사라진다',
  precondition: ['답글이 없는 내 댓글이 있다', '답글이 하나 달린 내 댓글이 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 혼자댓글 = '답글 없는 내 댓글';
  const 원댓글 = '답글 달린 내 댓글';
  const 답글 = '남겨 둘 답글 내용';
  let 나!: 글쓴이;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글을 쓰고 댓글 둘과 답글 하나를 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
      await 댓글달기(나.api, 글번호, 혼자댓글);
      const 댓글번호 = await 댓글달기(나.api, 글번호, 원댓글);
      await 댓글달기(나.api, 글번호, 답글, 댓글번호);
    });

    await test.step('답글이 없는 댓글과 답글이 있는 댓글이 있는지 확인한다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글(답글).waitFor();
      await verify('답글이 없는 내 댓글이 있다', (await 글있나(page.request, 글번호)) && (await 상세.댓글(혼자댓글).isVisible()), true, { blocker: true });
      await verify('답글이 하나 달린 내 댓글이 있다', (await 상세.댓글(원댓글).isVisible()) && (await 상세.댓글(답글).isVisible()), true, { blocker: true });
    });

    await test.step('내 댓글의 「삭제」를 누른다', async () => {
      await 상세.댓글삭제버튼(혼자댓글).click();
      await 상세.댓글(혼자댓글).waitFor({ state: 'detached' });
      await 상세.댓글삭제버튼(원댓글).click();
      await 상세.댓글(원댓글).waitFor({ state: 'detached' });
      await verify('답글이 없는 댓글을 지우면 목록에서 그 댓글이 사라진다', await 상세.댓글(혼자댓글).count(), 0);
      await verify('답글이 하나 있는 댓글을 지우면 목록에서 그 댓글 자리가 사라지지 않는다', await 상세.댓글('삭제된 댓글입니다').count(), 1);
    });
  } finally {
    await 정리.모두하기();
  }
});
