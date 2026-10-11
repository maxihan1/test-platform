import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 아래에있나, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-141',
  name: '게시글 상세 아래에 「댓글 {개수}」 제목과 댓글 목록이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원이 글을 쓰고 댓글을 하나 단다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '댓글글')).id;
      await 댓글달기(글쓴.api, 글번호, '목록에 보일 댓글');
    });

    await test.step('댓글이 달린 글이 있는지 확인한다', async () => {
      await verify('댓글이 달린 글이 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('댓글이 있는 게시글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글까지그려질때까지();
      const 제목글 = await 상세.댓글제목.innerText();
      const 개수가맞다 = 제목글 === '댓글 1' && (await 상세.댓글항목들.count()) === 1;
      await verify('게시글 상세 아래에 「댓글 {개수}」 제목과 댓글 목록이 보인다', 개수가맞다 && (await 아래에있나(상세.본문, 상세.댓글영역)), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
