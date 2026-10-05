import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글목록받기, 댓글여럿달기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-142',
  name: '댓글이 3개인 글은 목록 제목 옆에 「[3]」이 붙는다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글에 댓글이 3개 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 목록 = new 게시판목록화면(page);
    let 글제목 = '';
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 댓글이 3개 달린 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      const 글 = await 내글만들기(page.request, 정리);
      글제목 = 글.title;
      글번호 = 글.id;
      await 댓글여럿달기(page.request, 글.id, [고유이름('댓글'), 고유이름('댓글'), 고유이름('댓글')]);
    });

    await test.step('로그인과 내 글의 댓글 3개를 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(page.request)) !== '', true, { blocker: true });
      await verify('내 글에 댓글이 3개 있다', (await 댓글목록받기(page.request, 글번호)).length, 3, { blocker: true });
    });

    await test.step('게시판 목록에서 내 글 제목을 찾는다', async () => {
      await 안내창끄기(page);
      await 목록.열기();
      await 목록.행(글제목).waitFor();
      await verify('댓글이 3개인 글은 목록 제목 옆에 「[3]」이 붙는다', (await 목록.댓글수표시(글제목).innerText()).trim(), '[3]');
    });
  } finally {
    await 정리.비우기();
  }
});
