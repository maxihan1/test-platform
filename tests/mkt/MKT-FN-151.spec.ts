import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-151',
  name: '상세의 「목록」을 누르면 들어오기 전의 분류 「질문」 2쪽 목록으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 글 = new 게시글화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('분류 「질문」 2쪽 목록에서 글을 열고 「목록」을 누른다', async () => {
    await 목록.탭누르기('질문');
    await 목록.쪽누르기(2);
    await 목록.글링크들.first().click();
    await 글.댓글불러올때까지();
    await 글.목록링크.click();
    await 목록.내용그려질때까지();
    await verify('상세의 「목록」을 누르면 들어오기 전의 분류 「질문」 2쪽 목록으로 돌아간다', [await 목록.선택된탭.innerText(), await 목록.현재쪽.innerText()], ['질문', '2']);
  });
});
