import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 댓글달기, 읽지않은알림수 } from './components/data.component.js';
import { 고유이름, 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-210',
  name: '내 글에 내가 댓글을 달면 내 읽지 않은 알림이 늘지 않는다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    let 글번호 = 0;
    let 전 = 0;

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
      전 = await 읽지않은알림수(page.request);
      await verify('내 읽지 않은 알림이 0건이다', 전, 0, { blocker: true });
    });

    await test.step('내 글에 내가 댓글을 단다', async () => {
      await 댓글달기(page.request, 글번호, 고유이름('내가단댓글'));
      await verify('내 글에 내가 댓글을 달면 내 읽지 않은 알림이 늘지 않는다', (await 읽지않은알림수(page.request)) - 전, 0);
    });
  } finally {
    await 정리.비우기();
  }
});
