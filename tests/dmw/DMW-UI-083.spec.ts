import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-083',
  name: '게시판 목록 맨 위에 공지글이 「공지」 표시와 함께 보인다',
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

  await test.step('게시판 목록 맨 위를 확인한다', async () => {
    const 첫줄 = (await 목록.행들())[0];
    const 공지글 = await verify('맨 위 글이 공지글이다', 첫줄?.공지, true);
    const 표시 = await verify('맨 위 글에 「공지」 표시가 보인다', await 목록.공지표시.first().isVisible(), true);
    await verify('게시판 목록 맨 위에 공지글이 「공지」 표시와 함께 보인다', 공지글 && 표시, true);
  });

  await test.step('게시판 목록에서 「후기」 탭을 누른다', async () => {
    await 목록.탭누르기('후기');
    const 첫줄 = (await 목록.행들())[0];
    await verify('「후기」 탭에서도 공지글이 목록 맨 위에 보인다', 첫줄?.공지, true);
  });
});
