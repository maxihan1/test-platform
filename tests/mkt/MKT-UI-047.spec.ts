import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-047',
  name: '게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다',
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
      '게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다',
      (await 목록.탭글자들읽기()).join(' · '),
      '전체 · 자유 · 질문 · 후기',
    );
  });
});
