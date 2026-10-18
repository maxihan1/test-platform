import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-119',
  name: '분류 탭 「질문」을 누르면 공지를 뺀 글이 모두 분류 「질문」이다',
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

  await test.step('분류 탭 「질문」을 누른다', async () => {
    await 목록.탭누르기('질문');
    const 분류들 = (await 목록.일반행글자들()).map((칸) => 칸[1]);
    await verify('분류 탭 「질문」을 누르면 공지를 뺀 글이 모두 분류 「질문」이다', [...new Set(분류들)].join(', '), '질문');
  });
});
