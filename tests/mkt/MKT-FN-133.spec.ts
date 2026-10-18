import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-133',
  name: '「조회순」을 고르면 글이 조회수 많은 순으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('정렬 드롭다운에서 「조회순」을 고른다', async () => {
    await 목록.정렬고르기('조회순');
    const 조회수들 = (await 목록.일반행글자들()).map((칸) => Number(칸[5]));
    await verify('「조회순」을 고르면 글이 조회수 많은 순으로 보인다', 조회수들.length > 1 && 조회수들.every((조회수, 번) => 번 === 0 || (조회수들[번 - 1] ?? 0) >= 조회수), true);
  });
});
