import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-123',
  name: '분류와 쪽이 달라도 공지글이 목록 맨 위에 「공지」 표시와 함께 보인다',
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
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('분류 탭 「자유」의 2쪽을 연다', async () => {
    await 목록.탭누르기('자유');
    await 목록.쪽누르기(2);
    await verify('분류와 쪽이 달라도 공지글이 목록 맨 위에 「공지」 표시와 함께 보인다', (await 목록.행글자들())[0]?.[0], '공지');
  });
});
