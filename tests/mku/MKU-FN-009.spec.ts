import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-009',
  name: '알림 종을 누르면 알림 목록이 펼쳐져 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 홈 화면을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await page.goto('/');
    });

    await test.step('로그인한 홈 화면이 열렸는지 확인한다', async () => {
      await 머리.알림종.waitFor();
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('머리글 알림 종을 누른다', async () => {
      await 머리.알림종.click();
      await 머리.알림목록.waitFor();
      await verify('알림 종을 누르면 알림 목록이 펼쳐져 보인다', await 머리.알림목록.isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
