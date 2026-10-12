import { defineCase, test, verify } from '@platform/kit';

import { 글만들기, 글지우기, 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-113',
  name: '없는 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  precondition: ['비회원이다', '회원이 글을 하나 썼다가 지웠다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 지운글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('없는 글 번호 /board/999999 를 연다', async () => {
      await 상세.열기(999999);
      await 상세.그려질때까지();
      await verify('없는 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.isVisible(), true);
    });

    await test.step('회원으로 로그인해 글을 하나 쓰고 지운다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      지운글번호 = await 글만들기(나.api, { category: '자유', title: 표식('지울글'), content: '곧 지울 글입니다. 열 글자를 넘깁니다' });
      await 글지우기(나.api, 지운글번호);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('지운 글 번호로 상세를 연다', async () => {
      await 상세.열기(지운글번호);
      await 상세.그려질때까지();
      await verify('지운 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
