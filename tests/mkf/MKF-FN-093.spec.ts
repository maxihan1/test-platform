import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-093',
  name: '한 회원이 좋아요를 누른 글은 다시 열어도 좋아요 수가 처음보다 1만 많다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;
  let 글번호 = 0;
  let 처음좋아요수 = 0;

  await 방해막기(page);
  try {
    await test.step('새로 가입한 회원으로 로그인하고 다른 회원이 글을 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      글번호 = (await 글하나쓰기(남.api, '좋아요글')).id;
    });

    await test.step('다른 회원의 글 상세가 열렸는지 확인한다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      처음좋아요수 = await 상세.좋아요수();
      await verify('새로 가입한 회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('다른 회원의 글 상세가 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('「좋아요」를 누른 뒤 글을 새로 열고 좋아요 수를 확인한다', async () => {
      await 상세.좋아요.click();
      await 상세.눌린좋아요.waitFor();
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await 상세.눌린좋아요.waitFor();
      await verify('한 회원이 좋아요를 누른 글은 다시 열어도 좋아요 수가 처음보다 1만 많다', await 상세.좋아요수(), 처음좋아요수 + 1);
    });
  } finally {
    await 정리.모두하기();
  }
});
