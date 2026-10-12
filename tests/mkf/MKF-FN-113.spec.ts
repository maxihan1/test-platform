import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 글있나, 정리함만들기 } from './helpers/board-tools.helper.js';
import { 알림상황만들기 } from './helpers/board-extra.helper.js';
import type { 알림상황 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-113',
  name: '내 글에 내가 댓글을 달면 종 옆 알림 수가 늘지 않는다',
  precondition: ['글쓴이 회원의 글이 있다'],
  techniques: ['동등 분할'],
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

    await test.step('글쓴이 회원으로 자기 글에 댓글을 단 뒤 홈을 연다', async () => {
      await 댓글달기(상황.글쓴.api, 상황.글번호, '내가 단 내 글의 댓글');
      await API로그인(page.request, 상황.글쓴.정보.loginId, 상황.글쓴.정보.password);
      await Promise.all([page.waitForResponse((응답) => new URL(응답.url()).pathname === '/api/notifications'), page.goto('/')]);
      await 머리.알림종.waitFor();
      await verify('내 글에 내가 댓글을 달면 종 옆 알림 수가 늘지 않는다', await 머리.알림수.isVisible(), false);
    });
  } finally {
    await 정리.모두하기();
  }
});
