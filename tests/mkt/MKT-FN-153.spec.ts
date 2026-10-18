import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 글이있는가, 기본본문 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 글만들기, 글지우기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-153',
  name: '없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '회원이 쓴 글을 지웠다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 회원?: 회원정보; 지운글번호?: number } = {};

  try {
    await test.step('회원이 글을 쓰고 지운다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.지운글번호 = await 글만들기(request, { title: 고유글자('지운 글 확인'), content: 기본본문 });
      await 글지우기(request, 준비.지운글번호);
    });

    await test.step('지운 글이 없어졌는지 확인한다', async () => {
      await verify('지운 글은 더 조회되지 않는다', await 글이있는가(request, 준비.지운글번호 ?? 0), false, { blocker: true });
    });

    await test.step('없는 글 번호 「999999」의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(999999);
      await verify('비회원이라 머리글에 「로그아웃」이 없다', await 글.머리글.로그아웃버튼.count(), 0, { blocker: true });
      await verify('없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 글.없는글안내.isVisible(), true);
    });

    await test.step('지운 글의 상세 주소를 연다', async () => {
      await 글.열기(준비.지운글번호 ?? 0);
      await verify('삭제된 글로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 글.없는글안내.isVisible(), true);
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
