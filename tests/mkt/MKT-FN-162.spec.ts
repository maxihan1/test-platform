import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-162',
  name: '공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '공백 댓글 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('댓글 영역 제목이 「댓글 0」이다', await 글.댓글제목.innerText(), '댓글 0', { blocker: true });
    });

    await test.step('댓글 입력칸에 공백만 적고 「등록」을 누른다', async () => {
      await 글.댓글등록하기('     ');
      await verify('공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 나온다', await (await 알림.아무거나뜰때까지()).innerText(), '댓글 내용을 입력하세요');
    });

    await test.step('공백 댓글 등록 뒤 댓글 수를 확인한다', async () => {
      await verify('공백만 적고 등록하면 댓글이 늘지 않는다', await 글.댓글제목.innerText(), '댓글 0');
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});
