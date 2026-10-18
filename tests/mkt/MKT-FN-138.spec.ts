import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-138',
  name: '「좋아요」를 누르면 좋아요 수가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  let 앞좋아요수 = 0;

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '좋아요 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 준비.글?.제목, { blocker: true });
      앞좋아요수 = await 글.좋아요수읽기();
    });

    await test.step('그 글 상세에서 「좋아요」를 누른다', async () => {
      await 글.좋아요누르기();
      await verify('「좋아요」를 누르면 좋아요 수가 1 오른다', (await 글.좋아요수읽기()) - 앞좋아요수, 1);
    });

    await test.step('「좋아요」 버튼 하트를 확인한다', async () => {
      await verify('「좋아요」를 누르면 버튼이 채워진 하트로 바뀐다', (await 글.좋아요.innerText()).includes('♥'), true);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});
