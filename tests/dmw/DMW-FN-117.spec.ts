import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-117',
  name: '분류 · 정렬 · 쪽을 바꾼 뒤 새로 고쳐도 같은 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  let 바꾼목록: string[] = [];

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('분류 · 정렬 · 쪽을 바꾼 뒤 새로 고친다', async () => {
    await 목록.탭누르기('후기');
    await 목록.정렬고르기('좋아요순');
    await 목록.쪽누르기(2);
    바꾼목록 = (await 목록.행들()).map((행) => 행.제목);
    await page.reload();
    await 목록.그려질때까지();
    await verify('분류 · 정렬 · 쪽을 바꾼 뒤 새로 고쳐도 같은 목록이 보인다', (await 목록.행들()).map((행) => 행.제목), 바꾼목록);
  });

  await test.step('다른 쪽으로 간 뒤 뒤로 가기를 한다', async () => {
    await 목록.쪽누르기(1);
    await page.goBack();
    await 목록.쪽번호가될때까지(2);
    await 목록.그려질때까지();
    await verify('게시판 목록에서 뒤로 가기를 하면 앞 목록이 보인다', (await 목록.행들()).map((행) => 행.제목), 바꾼목록);
  });
});
