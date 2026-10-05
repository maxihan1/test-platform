import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-139',
  name: '「질문」 탭을 누르면 공지를 뺀 글의 분류가 모두 「질문」이다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록에서 「질문」 탭을 누른다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await 목록.탭누르고기다리기('질문');
    const 분류들 = [...new Set((await 목록.일반글읽기()).map((행) => 행.분류))];
    await verify('「질문」 탭을 누르면 공지를 뺀 글의 분류가 모두 「질문」이다', 분류들.join(', '), '질문');
  });
});
