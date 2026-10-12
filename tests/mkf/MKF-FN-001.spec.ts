import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 댓글목록, 정리함만들기 } from './helpers/board-tools.helper.js';
import { 알림상황만들기 } from './helpers/board-extra.helper.js';
import type { 알림상황 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-001',
  name: '내 글에 새 댓글이 달리면 머리글 종 옆에 읽지 않은 알림 수 「1」이 보인다',
  precondition: ['글쓴이 회원의 글에 다른 회원이 댓글을 달았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 상황!: 알림상황;

  await 방해막기(page);
  try {
    await test.step('글쓴이 회원의 글에 다른 회원이 댓글을 단다', async () => {
      상황 = await 알림상황만들기(page, 정리, '알림 확인용 댓글');
    });

    await test.step('글쓴이 회원의 글에 다른 회원 댓글이 달렸는지 확인한다', async () => {
      await verify('글쓴이 회원의 글에 다른 회원 댓글이 하나 있다', (await 댓글목록(상황.글쓴.api, 상황.글번호)).length, 1, { blocker: true });
    });

    await test.step('글쓴이 회원으로 로그인해 홈을 연다', async () => {
      await API로그인(page.request, 상황.글쓴.정보.loginId, 상황.글쓴.정보.password);
      await page.goto('/');
      await 머리.알림종.waitFor();
      await 머리.알림수.waitFor();
      await verify('내 글에 새 댓글이 달리면 머리글 종 옆에 읽지 않은 알림 수 「1」이 보인다', await 머리.알림수.innerText(), '1');
    });
  } finally {
    await 정리.모두하기();
  }
});
