import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-109',
  name: '다른 회원이 쓴 글 상세에는 「수정」 · 「삭제」 버튼이 보이지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('다른 회원이 쓴 글 상세를 연다', async () => {
      await 상세.열기(1);
      await 상세.그려질때까지();
      await verify('다른 회원이 쓴 글 상세에는 「수정」 · 「삭제」 버튼이 보이지 않는다', !(await 상세.수정.isVisible()) && !(await 상세.삭제.isVisible()), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
