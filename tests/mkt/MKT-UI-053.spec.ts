import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-053',
  name: '게시판 목록 정렬 선택 상자에 「최신순」 · 「조회순」 · 「좋아요순」이 있다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록을 연다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await verify(
      '게시판 목록 정렬 선택 상자에 「최신순」 · 「조회순」 · 「좋아요순」이 있다',
      (await 목록.정렬옵션글자들읽기()).join(' · '),
      '최신순 · 조회순 · 좋아요순',
    );
    await verify('정렬은 처음에 「최신순」이 골라져 있다', await 목록.정렬글자읽기(), '최신순');
  });
});
