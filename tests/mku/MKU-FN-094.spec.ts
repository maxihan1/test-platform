import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-094',
  name: '정렬을 「조회순」으로 고르면 공지를 뺀 글이 조회수가 많은 순으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('정렬 드롭다운에서 「조회순」을 고른다', async () => {
    await 목록.정렬고르기('조회순');
    await 목록.그려질때까지();
    const 조회수들 = (await 목록.일반행들()).map((행) => 행.조회수);
    await verify('정렬을 「조회순」으로 고르면 공지를 뺀 글이 조회수가 많은 순으로 보인다', 조회수들.length > 1 && 조회수들.every((값, 차례) => 차례 === 0 || (조회수들[차례 - 1] ?? 0) >= 값), true);
  });

  await test.step('정렬 드롭다운에서 「좋아요순」을 고른다', async () => {
    await 목록.정렬고르기('좋아요순');
    await 목록.그려질때까지();
    const 좋아요들 = (await 목록.일반행들()).map((행) => 행.좋아요);
    await verify('정렬을 「좋아요순」으로 고르면 공지를 뺀 글이 좋아요가 많은 순으로 보인다', 좋아요들.length > 1 && 좋아요들.every((값, 차례) => 차례 === 0 || (좋아요들[차례 - 1] ?? 0) >= 값), true);
  });
});
