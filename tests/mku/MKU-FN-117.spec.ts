import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-117',
  name: '댓글 두 개를 차례로 달면 먼저 단 댓글이 위에 보인다',
  precondition: ['회원으로 로그인해 내 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 첫째 = '먼저 단 댓글';
  const 둘째 = '나중에 단 댓글';
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

    await test.step('댓글 두 개를 차례로 단다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글까지그려질때까지();
      await 상세.댓글달기(첫째);
      await 상세.댓글(첫째).waitFor();
      await 상세.댓글달기(둘째);
      await 상세.댓글(둘째).waitFor();
      await verify('댓글 두 개를 차례로 달면 먼저 단 댓글이 위에 보인다', (await 상세.댓글내용들()).join(' | '), `${첫째} | ${둘째}`);
    });
  } finally {
    await 정리.모두하기();
  }
});
