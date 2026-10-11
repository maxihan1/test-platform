import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-125',
  name: '다른 회원이 내 글에 댓글을 달면 내 알림 목록에 그 알림이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;
  let 글제목 = '';
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 내 글에 다른 회원이 댓글을 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      const 글 = await 글하나쓰기(나.api, '알림글');
      글제목 = 글.제목;
      await 댓글달기(남.api, 글.id, '알림을 만든 댓글');
      await page.goto('/');
    });

    await test.step('로그인한 홈 화면이 열렸는지 확인한다', async () => {
      await 머리.알림수.waitFor();
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('다른 회원이 내 글에 댓글을 단 뒤 알림 종을 누른다', async () => {
      await 머리.알림종.click();
      await 머리.알림목록.waitFor();
      await verify('다른 회원이 내 글에 댓글을 달면 내 알림 목록에 그 알림이 보인다', await 머리.알림목록.getByRole('link').filter({ hasText: 글제목 }).isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
