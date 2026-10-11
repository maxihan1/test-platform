import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글있나, 글하나쓰기, 댓글목록, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-114',
  name: '댓글 「등록」을 빠르게 두 번 누르면 댓글이 하나만 생긴다',
  precondition: ['회원이 쓴 글이 하나 있다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 내용 = '두 번 눌러 단 댓글';
  let 나!: 글쓴이;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('댓글을 적고 「등록」을 빠르게 두 번 누른다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글까지그려질때까지();
      await 상세.새댓글입력.fill(내용);
      await 상세.새댓글등록.dblclick();
      await 상세.댓글(내용).first().waitFor();
      await page.waitForTimeout(500);
      const 같은댓글 = (await 댓글목록(page.request, 글번호)).filter((댓글) => 댓글.content === 내용);
      await verify('댓글 「등록」을 빠르게 두 번 누르면 댓글이 하나만 생긴다', 같은댓글.length, 1);
    });
  } finally {
    await 정리.모두하기();
  }
});
