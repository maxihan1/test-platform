import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-096',
  name: '게시판 목록 표에 번호 · 분류 · 제목 · 작성자 · 작성일 · 조회수 · 좋아요 칸이 보인다',
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

  await test.step('게시판 목록 표의 머리를 확인한다', async () => {
    await verify('게시판 목록 표에 번호 · 분류 · 제목 · 작성자 · 작성일 · 조회수 · 좋아요 칸이 보인다', (await 목록.표머리칸들.allInnerTexts()).join(', '), '번호, 분류, 제목, 작성자, 작성일, 조회수, 좋아요');
  });
});
