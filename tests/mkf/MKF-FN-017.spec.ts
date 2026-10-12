import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 정리함만들기 } from './helpers/board-tools.helper.js';
import { 알림상황만들기 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-017',
  name: '알림 종을 누르면 알림 목록이 펼쳐진다',
  precondition: ['글쓴이 회원의 글에 다른 회원이 댓글을 달아 읽지 않은 알림이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();

  await 방해막기(page);
  try {
    await test.step('글쓴이 회원의 글에 다른 회원이 댓글을 달아 읽지 않은 알림을 만든다', async () => {
      const 상황 = await 알림상황만들기(page, 정리, '알림을 만든 댓글');
      await API로그인(page.request, 상황.글쓴.정보.loginId, 상황.글쓴.정보.password);
      await page.goto('/');
    });

    await test.step('읽지 않은 알림이 있는지 확인한다', async () => {
      await 머리.알림수.waitFor();
      await verify('읽지 않은 알림 수 「1」이 보인다', await 머리.알림수.innerText(), '1', { blocker: true });
    });

    await test.step('글쓴이 회원으로 머리글 알림 종을 누른다', async () => {
      await 머리.알림종.click();
      await 머리.알림목록.waitFor();
      await verify('알림 종을 누르면 알림 목록이 펼쳐진다', await 머리.알림목록.isVisible(), true);
    });

    await test.step('알림 목록을 펼친 뒤 홈을 새로 고친다', async () => {
      await Promise.all([page.waitForResponse((응답) => new URL(응답.url()).pathname === '/api/notifications'), page.reload()]);
      await 머리.알림종.waitFor();
      await verify('알림 목록을 열면 종 옆 알림 수가 사라진다', await 머리.알림수.isVisible(), false);
    });
  } finally {
    await 정리.모두하기();
  }
});
