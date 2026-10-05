import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글여럿달기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-068',
  name: '내 댓글에 「수정」 · 「삭제」 버튼이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 댓글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 내용 = 고유이름('내댓글');
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 댓글이 달린 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
      await 댓글여럿달기(page.request, 글번호, [내용]);
    });

    await test.step('내 댓글이 있는 게시글 상세를 연다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글(내용).waitFor();
      await verify('내 댓글이 보인다', await 상세.댓글(내용).isVisible(), true, { blocker: true });
      const 보임 = (await 상세.댓글수정버튼(내용).isVisible()) && (await 상세.댓글삭제버튼(내용).isVisible());
      await verify('내 댓글에 「수정」 · 「삭제」 버튼이 보인다', 보임, true);
    });
  } finally {
    await 정리.비우기();
  }
});
