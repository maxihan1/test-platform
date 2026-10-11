import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-126',
  name: '내 글에 내가 댓글을 달면 알림 수가 늘지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 내 글에 내가 댓글을 단다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      const 글 = await 글하나쓰기(나.api, '알림글');
      await 댓글달기(나.api, 글.id, '내가 단 내 글의 댓글');
    });

    await test.step('로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('내 글에 내가 댓글을 단 뒤 홈을 연다', async () => {
      await Promise.all([page.waitForResponse((응답) => new URL(응답.url()).pathname === '/api/notifications'), page.goto('/')]);
      await 머리.알림종.waitFor();
      await verify('내 글에 내가 댓글을 달면 알림 수가 늘지 않는다', await 머리.알림수.isVisible(), false);
    });
  } finally {
    await 정리.모두하기();
  }
});
