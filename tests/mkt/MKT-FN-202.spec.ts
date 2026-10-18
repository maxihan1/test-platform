import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 글제목읽기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-202',
  name: '작성자가 아닌 회원이 수정 주소로 들어가면 「권한이 없습니다」 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 권한 = new 관리자화면(page);
  const 준비: { 글쓴이?: 글쓴이와글; 보는회원?: 회원정보 } = {};

  try {
    await test.step('다른 회원이 쓴 글을 만들고 회원으로 로그인한다', async () => {
      준비.글쓴이 = await 글쓴이와글만들기(request, '남의 글 수정 주소 확인');
      준비.보는회원 = await 새회원으로로그인(page.request);
    });

    await test.step('다른 회원이 쓴 글이 만들어졌는지 확인한다', async () => {
      await verify('다른 회원이 쓴 글이 만들어져 있다', await 글제목읽기(page.request, 준비.글쓴이?.글번호 ?? 0), 준비.글쓴이?.제목, { blocker: true });
    });

    await test.step('다른 회원 글의 수정 주소를 연다', async () => {
      await 방해창막기(page);
      await 권한.주소로열기(`/board/${준비.글쓴이?.글번호}/edit`);
      await 권한.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 권한.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('작성자가 아닌 회원이 수정 주소로 들어가면 「권한이 없습니다」 화면이 보인다', await 권한.권한없음제목.isVisible(), true);
    });
  } finally {
    if (준비.보는회원) await 회원정리(page.request, 준비.보는회원);
    if (준비.글쓴이) await 글쓴이와글정리(request, 준비.글쓴이);
  }
});
