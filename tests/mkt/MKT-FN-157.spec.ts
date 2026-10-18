import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-157',
  name: '0자로 「등록」하면 댓글이 늘지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 한글자 = '가';
  const 삼백자 = '나'.repeat(300);
  const 삼백일자 = '다'.repeat(301);

  try {
    await test.step('회원이 쓴 글을 만든다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '댓글 길이 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('댓글 영역 제목이 「댓글 0」이다', await 글.댓글제목.innerText(), '댓글 0', { blocker: true });
    });

    await test.step('댓글 입력칸을 비운 채 「등록」을 누른다', async () => {
      await 글.등록버튼.click();
      await 알림.아무거나뜰때까지();
      await verify('0자로 「등록」하면 댓글이 늘지 않는다', await 글.댓글제목.innerText(), '댓글 0');
    });

    await test.step('댓글 입력칸에 1자를 적고 「등록」을 누른다', async () => {
      await 글.댓글등록하기(한글자);
      await 글.댓글수가될때까지(1);
      await verify('1자 댓글을 등록하면 댓글 목록에 그 댓글이 보인다', (await 글.댓글내용들.allInnerTexts()).includes(한글자), true);
    });

    await test.step('댓글 입력칸에 300자를 적고 「등록」을 누른다', async () => {
      await 글.댓글등록하기(삼백자);
      await 글.댓글수가될때까지(2);
      await verify('300자 댓글을 등록하면 댓글 목록에 그 댓글이 보인다', (await 글.댓글내용들.allInnerTexts()).includes(삼백자), true);
    });

    await test.step('댓글 입력칸에 301자를 적는다', async () => {
      await 글.댓글적기(삼백일자);
      await verify('댓글 입력칸에 301자를 적으면 300자까지만 들어간다', (await 글.댓글입력.inputValue()).length, 300);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});
