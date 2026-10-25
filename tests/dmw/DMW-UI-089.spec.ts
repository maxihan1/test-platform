import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-089',
  name: '게시판 정렬에 「최신순」 · 「조회순」 · 「좋아요순」이 있고 「최신순」이 골라져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 정렬 선택 상자를 확인한다', async () => {
    const 선택지 = await verify('정렬 선택지가 「최신순」 · 「조회순」 · 「좋아요순」이다', (await 목록.정렬.getByRole('option').allInnerTexts()).join(', '), '최신순, 조회순, 좋아요순');
    const 골라짐 = await verify('골라져 있는 정렬이 「최신순」이다', await 목록.정렬.getByRole('option', { selected: true }).innerText(), '최신순');
    await verify('게시판 정렬에 「최신순」 · 「조회순」 · 「좋아요순」이 있고 「최신순」이 골라져 있다', 선택지 && 골라짐, true);
  });
});
