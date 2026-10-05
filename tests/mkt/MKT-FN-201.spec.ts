import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 댓글달기 } from './components/data.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-201',
  name: '답글에는 「답글」 버튼이 보이지 않는다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글의 댓글에 답글이 하나 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 답글내용 = 고유이름('달린답글');
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 댓글에 답글이 달린 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
      const 댓글 = await 댓글달기(page.request, 글번호, 고유이름('원댓글'));
      await 댓글달기(page.request, 글번호, 답글내용, 댓글.id);
    });

    await test.step('내 글 상세를 연다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글(답글내용).waitFor();
      await verify('내 글의 댓글에 달린 답글이 보인다', await 상세.댓글(답글내용).isVisible(), true, { blocker: true });
      await verify('답글에는 「답글」 버튼이 보이지 않는다', await 상세.답글버튼(답글내용).isVisible(), false);
    });
  } finally {
    await 정리.비우기();
  }
});
