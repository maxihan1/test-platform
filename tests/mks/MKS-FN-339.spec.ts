import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-339',
  name: '「좋아요순」을 고르면 일반 글이 좋아요가 많은 순으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('커뮤니티 목록을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
  });

  await test.step('커뮤니티 목록이 열렸는지 확인한다', async () => {
    await verify('커뮤니티 목록 화면이 열려 있다', 경로(page), 게시판목록화면.주소, { blocker: true });
  });

  await test.step('커뮤니티 목록 정렬에서 「좋아요순」을 고른다', async () => {
    await 목록.정렬고르기('좋아요순');
    const 값들 = (await 목록.일반행들()).map((행) => 행.좋아요);
    await verify('「좋아요순」을 고르면 일반 글이 좋아요가 많은 순으로 보인다', 값들, [...값들].sort((앞, 뒤) => 뒤 - 앞));
  });
});
