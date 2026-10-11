import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-142',
  name: '댓글마다 작성자 · 작성 시각 · 내용이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 내용 = '작성자와 시각을 볼 댓글';
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원이 글을 쓰고 댓글을 하나 단다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '댓글글')).id;
      await 댓글달기(글쓴.api, 글번호, 내용);
    });

    await test.step('댓글이 달린 글이 있는지 확인한다', async () => {
      await verify('댓글이 달린 글이 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('댓글이 있는 게시글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글(내용).waitFor();
      const 글자 = await 상세.댓글(내용).innerText();
      await verify('댓글마다 작성자 · 작성 시각 · 내용이 보인다', 글자.includes(글쓴.정보.name) && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(글자) && 글자.includes(내용), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
