import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-085',
  name: '게시판 목록 첫 쪽에서 「이전」이 눌리지 않는다',
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

  await test.step('게시판 목록 첫 쪽의 「이전」을 확인한다', async () => {
    await verify('게시판 목록 첫 쪽에서 「이전」이 눌리지 않는다', await 목록.이전.isDisabled(), true);
  });

  await test.step('게시판 목록 마지막 쪽의 「다음」을 확인한다', async () => {
    await 목록.쪽누르기(await 목록.마지막쪽번호());
    await verify('게시판 목록 마지막 쪽에서 「다음」이 눌리지 않는다', await 목록.다음.isDisabled(), true);
  });
});
