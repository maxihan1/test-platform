import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-010',
  name: '알림 목록을 열면 알림 종 옆 알림 수가 보이지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 내 글에 다른 회원이 댓글을 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      const 글 = await 글하나쓰기(나.api, '알림글');
      await 댓글달기(남.api, 글.id, '알림을 만든 댓글');
      await page.goto('/');
    });

    await test.step('읽지 않은 알림이 있는지 확인한다', async () => {
      await 머리.알림수.waitFor();
      await verify('회원으로 로그인해 있고 읽지 않은 알림이 있다', (await 로그인해있나(page.request)) && (await 머리.알림수.innerText()) === '1', true, { blocker: true });
    });

    await test.step('읽지 않은 알림이 있을 때 알림 종을 눌러 목록을 연다', async () => {
      await 머리.알림종.click();
      await 머리.알림목록.waitFor();
      await 머리.알림수.waitFor({ state: 'hidden' });
      await verify('알림 목록을 열면 알림 종 옆 알림 수가 보이지 않는다', await 머리.알림수.isVisible(), false);
    });
  } finally {
    await 정리.모두하기();
  }
});
