import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-080',
  name: '게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
    const 탭들 = await 목록.탭들.allInnerTexts();
    await verify('게시판 목록 위에 분류 탭 「전체」 · 「자유」 · 「질문」 · 「후기」가 보인다', 탭들.join(', '), '전체, 자유, 질문, 후기');
  });
});
