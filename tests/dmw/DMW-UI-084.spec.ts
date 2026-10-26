import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-084',
  name: '게시판 목록 아래에 페이지 번호 · 「이전」 · 「다음」이 보인다',
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

  await test.step('게시판 목록 아래를 확인한다', async () => {
    const 번호 = await verify('페이지 번호가 보인다', await 목록.쪽(1).isVisible(), true);
    const 이전 = await verify('「이전」이 보인다', await 목록.이전.isVisible(), true);
    const 다음 = await verify('「다음」이 보인다', await 목록.다음.isVisible(), true);
    await verify('게시판 목록 아래에 페이지 번호 · 「이전」 · 「다음」이 보인다', 번호 && 이전 && 다음, true);
  });
});
