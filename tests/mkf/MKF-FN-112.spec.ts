import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 정리함만들기 } from './helpers/board-tools.helper.js';
import { 알림상황만들기 } from './helpers/board-extra.helper.js';
import type { 알림상황 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-112',
  name: '남의 글에 댓글을 달면 글쓴이 알림 목록에 그 알림이 보인다',
  precondition: ['글쓴이 회원의 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 상황!: 알림상황;

  await 방해막기(page);
  try {
    await test.step('글쓴이 회원이 글을 하나 쓴다', async () => {
      상황 = await 알림상황만들기(page, 정리);
    });

    await test.step('글쓴이 회원의 글이 있는지 확인한다', async () => {
      await verify('글쓴이 회원의 글이 하나 있다', await 글있나(page.request, 상황.글번호), true, { blocker: true });
    });

    await test.step('다른 회원으로 그 글에 댓글을 단 뒤 글쓴이로 알림 종을 누른다', async () => {
      await 댓글달기(상황.남.api, 상황.글번호, '알림을 만든 댓글');
      await API로그인(page.request, 상황.글쓴.정보.loginId, 상황.글쓴.정보.password);
      await page.goto('/');
      await 머리.알림수.waitFor();
      await 머리.알림종.click();
      await 머리.알림목록.waitFor();
      await verify('남의 글에 댓글을 달면 글쓴이 알림 목록에 그 알림이 보인다', await 머리.알림목록.getByRole('link').filter({ hasText: 상황.제목 }).isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
