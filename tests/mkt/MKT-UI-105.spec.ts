import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-105',
  name: '정렬 드롭다운에 「최신순」 · 「조회순」 · 「좋아요순」이 있고 「최신순」이 골라져 있다',
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

  await test.step('게시판 목록의 정렬 드롭다운을 확인한다', async () => {
    await verify('정렬 드롭다운에 「최신순」 · 「조회순」 · 「좋아요순」이 있고 「최신순」이 골라져 있다', [(await 목록.정렬옵션들.allInnerTexts()).join(', '), await 목록.선택된정렬.innerText()], ['최신순, 조회순, 좋아요순', '최신순']);
  });
});
