import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-103',
  name: '「질문」 탭을 누르면 공지 말고는 분류가 「질문」인 글만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  smoke: true,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 「질문」 탭을 누른다', async () => {
    await 목록.탭누르기('질문');
    const 분류들 = (await 목록.일반행들()).map((행) => 행.분류);
    await verify('「질문」 탭을 누르면 공지 말고는 분류가 「질문」인 글만 보인다', [...new Set(분류들)], ['질문']);
  });
});
