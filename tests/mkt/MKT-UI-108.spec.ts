import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-108',
  name: '게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('게시판 목록을 연다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다', (await 목록.분류탭들.getByRole('tab').allInnerTexts()).join(' · '), '전체 · 자유 · 질문 · 후기');
  });
});
