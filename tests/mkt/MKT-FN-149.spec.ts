import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글목록받기 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-149',
  name: '게시판 목록 첫 페이지에는 공지를 뺀 글이 10개 보인다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 첫 페이지를 연다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await verify('게시판 목록 첫 페이지에는 공지를 뺀 글이 10개 보인다', (await 목록.일반글읽기()).length, 10);
  });

  await test.step('게시판 목록에서 「2」 페이지를 누른다', async () => {
    const 열한째 = (await 글목록받기(page.request, { page: '1', size: '11' })).items[10]?.title;
    await 목록.쪽누르고기다리기(2);
    await verify('11번째 글은 둘째 페이지 첫 줄에 보인다', (await 목록.일반글읽기())[0]?.제목, 열한째);
  });
});
