import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글여럿달기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-143',
  name: '댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '댓글이 없는 내 글이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 목록 = new 게시판목록화면(page);
    let 글번호 = 0;
    let 글제목 = '';

    await test.step('새로 만든 회원으로 로그인하고 댓글이 없는 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      const 글 = await 내글만들기(page.request, 정리);
      글번호 = 글.id;
      글제목 = 글.title;
    });

    await test.step('게시판 목록에서 댓글이 없는 내 글 제목을 찾는다', async () => {
      await 안내창끄기(page);
      await 목록.열기();
      await 목록.행(글제목).waitFor();
      await verify('내 글이 게시판 목록에 보인다', await 목록.행(글제목).isVisible(), true, { blocker: true });
      await verify('댓글이 0개인 글 제목 옆에는 댓글 수가 붙지 않는다', await 목록.댓글수표시(글제목).count(), 0);
    });

    await test.step('그 글에 댓글 하나를 달고 게시판 목록을 다시 연다', async () => {
      await 댓글여럿달기(page.request, 글번호, [고유이름('댓글')]);
      await 목록.열기();
      await 목록.행(글제목).waitFor();
      await verify('댓글이 1개가 되면 제목 옆에 「[1]」이 붙는다', (await 목록.댓글수표시(글제목).innerText()).trim(), '[1]');
    });
  } finally {
    await 정리.비우기();
  }
});
