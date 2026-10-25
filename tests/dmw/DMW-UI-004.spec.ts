import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 로그인상태인가, 하위메뉴누르기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-004',
  name: '하위 메뉴 「자유게시판」을 누르면 「자유」 분류 탭이 선택된 게시판 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 목록 = new 게시판목록화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 안내창막기(page);
    await page.goto('/');
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
  });

  await test.step('하위 메뉴 「자유게시판」을 누른다', async () => {
    await 하위메뉴누르기(page, 머리.자유게시판);
    await 목록.그려질때까지();
    const 목록보임 = await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true);
    const 자유선택 = await verify('선택된 분류 탭이 「자유」다', await 목록.선택된탭(), '자유');
    await verify('하위 메뉴 「자유게시판」을 누르면 「자유」 분류 탭이 선택된 게시판 목록이 보인다', 목록보임 && 자유선택, true);
  });
});
