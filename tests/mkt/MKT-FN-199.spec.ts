import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글여럿달기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-199',
  name: '「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글에 댓글이 하나 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 댓글내용 = 고유이름('원댓글');
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 댓글이 하나 달린 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
      await 댓글여럿달기(page.request, 글번호, [댓글내용]);
    });

    await test.step('내 글 상세를 열고 댓글이 보이는지 확인한다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글(댓글내용).waitFor();
      await verify('내 글에 달린 댓글이 보인다', await 상세.댓글(댓글내용).isVisible(), true, { blocker: true });
    });

    await test.step('그 댓글의 「답글」을 누른다', async () => {
      await 상세.답글버튼(댓글내용).click();
      await 상세.답글입력칸(댓글내용).waitFor();
      await verify(
        '「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
        { 열림: await 상세.답글입력칸(댓글내용).isVisible(), 아래: await 상세.답글입력칸이댓글아래인가(댓글내용) },
        { 열림: true, 아래: true },
      );
    });

    await test.step('답글 입력칸에 「답글입니다」를 적고 「등록」을 누른다', async () => {
      await 상세.답글입력칸(댓글내용).fill('답글입니다');
      await 상세.답글등록버튼(댓글내용).click();
      await 상세.댓글('답글입니다').waitFor();
      await verify('답글 「답글입니다」가 그 댓글 아래에 보인다', await 상세.댓글순서읽기(), [댓글내용, '답글입니다']);
    });
  } finally {
    await 정리.비우기();
  }
});
