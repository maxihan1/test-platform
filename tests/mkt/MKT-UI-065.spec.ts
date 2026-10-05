import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-065',
  name: '게시글 상세 댓글 입력칸 오른쪽 아래에 「0/300」이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글이 있다'],
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

    await test.step('내 글 상세를 연다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글입력칸.waitFor();
      await verify('댓글 입력칸이 보인다', await 상세.댓글입력칸.isVisible(), true, { blocker: true });
      await verify(
        '게시글 상세 댓글 입력칸 오른쪽 아래에 「0/300」이 보인다',
        { 글자수: (await 상세.댓글글자수.innerText()).trim(), 오른쪽아래: await 상세.댓글글자수가입력칸오른쪽아래인가() },
        { 글자수: '0/300', 오른쪽아래: true },
      );
    });
  } finally {
    await 정리.비우기();
  }
});
