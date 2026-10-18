import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-137',
  name: '게시글 상세를 다시 열면 조회수가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  let 앞조회수 = 0;

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '조회수 확인');
    });

    await test.step('그 글의 상세를 한 번 열어 조회수를 읽는다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await verify('비회원이라 머리글에 「로그아웃」이 없다', await 글.머리글.로그아웃버튼.count(), 0, { blocker: true });
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 준비.글?.제목, { blocker: true });
      앞조회수 = await 글.조회수읽기();
    });

    await test.step('같은 글 상세를 한 번 더 연다', async () => {
      await 글.열기(준비.글?.글번호 ?? 0);
      await verify('게시글 상세를 다시 열면 조회수가 1 오른다', (await 글.조회수읽기()) - 앞조회수, 1);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});
