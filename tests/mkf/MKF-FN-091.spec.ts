import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 좋아요되돌리기 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-091',
  name: '「좋아요」를 누르면 좋아요 수가 1 오른다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  await 방해막기(page);
  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      정리.더하기(() => 좋아요되돌리기(나.api, 1));
    });

    await test.step('공지 글 상세가 열렸는지 확인한다', async () => {
      await 상세.열기(1);
      await 상세.그려질때까지();
      await verify('새로 가입한 회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('공지 글 상세가 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('공지 글 상세에서 「좋아요」를 누른다', async () => {
      const 누르기전 = await 상세.좋아요수();
      await 상세.좋아요.click();
      await 상세.눌린좋아요.waitFor();
      await verify('「좋아요」를 누르면 좋아요 수가 1 오른다', await 상세.좋아요수(), 누르기전 + 1);
    });

    await test.step('공지 글 상세에서 「좋아요」를 누른 뒤 버튼을 확인한다', async () => {
      await verify('「좋아요」를 누르면 버튼이 채워진 하트로 바뀐다', (await 상세.좋아요.innerText()).includes('♥'), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
