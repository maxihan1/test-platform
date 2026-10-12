import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-104',
  name: '댓글 입력칸에 3자를 적으면 글자 수가 「3/300」으로 바뀐다',
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
    await test.step('새로 가입한 회원으로 로그인해 게시글 상세를 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await 상세.열기(1);
    });

    await test.step('댓글 입력칸이 보이는지 확인한다', async () => {
      await 상세.새댓글입력.waitFor();
      await verify('새로 가입한 회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('댓글 입력칸이 보인다', await 상세.새댓글입력.isVisible(), true, { blocker: true });
    });

    await test.step('댓글 입력칸에 3자를 적는다', async () => {
      await 상세.새댓글입력.fill('안녕하');
      await verify('댓글 입력칸에 3자를 적으면 글자 수가 「3/300」으로 바뀐다', await 상세.새댓글글자수.innerText(), '3/300');
    });
  } finally {
    await 정리.모두하기();
  }
});
