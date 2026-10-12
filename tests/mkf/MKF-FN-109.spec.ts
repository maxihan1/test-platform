import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-109',
  name: '댓글을 고쳐 저장하면 그 댓글에 「(수정됨)」이 붙는다',
  precondition: ['내가 댓글을 단 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 내용 = '고치기 전 내 댓글';
  const 고친내용 = '고친 뒤 내 댓글';
  let 나!: 글쓴이;
  let 글번호 = 0;

  await 방해막기(page);
  try {
    await test.step('회원으로 로그인해 글을 쓰고 댓글을 하나 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
      await 댓글달기(나.api, 글번호, 내용);
    });

    await test.step('내가 댓글을 단 글이 있는지 확인한다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글(내용).waitFor();
      await verify('내가 댓글을 단 글이 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('내 댓글을 고쳐 「저장」을 누른다', async () => {
      await 상세.댓글수정버튼(내용).click();
      await 상세.댓글수정입력(내용).fill(고친내용);
      await 상세.댓글칸버튼(내용, '저장').click();
      await 상세.댓글(고친내용).waitFor();
      await verify('댓글을 고쳐 저장하면 그 댓글에 「(수정됨)」이 붙는다', await 상세.댓글(고친내용).getByText('(수정됨)').isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
