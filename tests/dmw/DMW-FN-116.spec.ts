import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-116',
  name: '정렬을 「조회순」으로 바꾸면 조회수가 많은 순으로 보인다',
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

  await test.step('게시판 정렬을 「조회순」으로 바꾼다', async () => {
    await 목록.정렬고르기('조회순');
    const 조회수들 = (await 목록.일반행들()).map((행) => 행.조회수);
    await verify('정렬을 「조회순」으로 바꾸면 조회수가 많은 순으로 보인다', 조회수들, [...조회수들].sort((앞, 뒤) => 뒤 - 앞));
  });
});
