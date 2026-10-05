import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-169',
  name: '「좋아요」를 누르면 좋아요 수가 1 오른다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '좋아요가 0인 내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
    });

    await test.step('내 글 상세에서 「좋아요」를 누른다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await verify('내 글의 좋아요가 0이다', await 상세.좋아요수읽기(), 0, { blocker: true });
      await 상세.좋아요누르고기다리기(true);
      await verify('「좋아요」를 누르면 좋아요 수가 1 오른다', await 상세.좋아요수읽기(), 1);
      await verify('「좋아요」 버튼이 채워진 하트로 바뀐다', await 상세.채운하트.isVisible(), true);
    });

    await test.step('「좋아요」를 다시 누른다', async () => {
      await 상세.좋아요누르고기다리기(false);
      await verify('다시 누르면 좋아요가 취소되어 좋아요 수가 0으로 돌아간다', await 상세.좋아요수읽기(), 0);
    });
  } finally {
    await 정리.비우기();
  }
});
