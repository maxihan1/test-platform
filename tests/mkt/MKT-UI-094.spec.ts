import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-094',
  name: '게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다', [(await 목록.분류탭들.allInnerTexts()).join(', '), await 목록.탭이표위에있는가()], ['전체, 자유, 질문, 후기', true]);
  });
});
