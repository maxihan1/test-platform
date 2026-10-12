import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 로그인해있나, 정리함만들기 } from './helpers/board-tools.helper.js';
import { 알림상황만들기 } from './helpers/board-extra.helper.js';
import type { 알림상황 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-018',
  name: '홈을 열어 둔 사이 새 댓글이 달리면 10초 안에 종 옆 알림 수 「1」이 보인다',
  precondition: ['글쓴이 회원으로 로그인해 홈을 열어 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 상황!: 알림상황;

  await 방해막기(page);
  try {
    await test.step('글쓴이 회원으로 로그인해 홈을 열어 둔다', async () => {
      상황 = await 알림상황만들기(page, 정리);
      await API로그인(page.request, 상황.글쓴.정보.loginId, 상황.글쓴.정보.password);
      await page.goto('/');
    });

    await test.step('알림이 없는 홈이 열렸는지 확인한다', async () => {
      await 머리.알림종.waitFor();
      await verify('글쓴이 회원으로 로그인해 있고 알림 수가 보이지 않는다', (await 로그인해있나(page.request)) && !(await 머리.알림수.isVisible()), true, { blocker: true });
    });

    await test.step('홈을 열어 둔 채 다른 회원이 글쓴이의 글에 댓글을 단다', async () => {
      await 댓글달기(상황.남.api, 상황.글번호, '홈을 열어 둔 채 단 댓글');
      await 머리.알림수.waitFor({ timeout: 15_000 });
      await verify('홈을 열어 둔 사이 새 댓글이 달리면 10초 안에 종 옆 알림 수 「1」이 보인다', await 머리.알림수.innerText(), '1');
    });
  } finally {
    await 정리.모두하기();
  }
});
