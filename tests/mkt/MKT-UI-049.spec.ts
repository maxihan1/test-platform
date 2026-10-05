import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-049',
  name: '게시판 목록 맨 위에 「공지」 표시가 붙은 글이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록을 연다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    const 첫줄 = (await 목록.행읽기())[0];
    await verify('게시판 목록 맨 위에 「공지」 표시가 붙은 글이 보인다', 첫줄?.공지, true);
  });
});
