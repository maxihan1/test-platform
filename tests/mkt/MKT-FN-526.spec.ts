import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 기본본문, 제목으로찾은글번호들, 제목으로찾은글지우기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-526',
  name: '글쓰기 「등록」을 빠르게 두 번 눌러도 글이 하나만 생긴다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 준비: { 회원?: 회원정보 } = {};
  const 제목 = 고유글자('두 번 누른 글');

  try {
    await test.step('새 회원으로 로그인하고 글쓰기 화면을 연다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
      await 쓰기.열기();
    });

    await test.step('회원으로 로그인해 글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.글쓰기제목.isVisible(), true, { blocker: true });
    });

    await test.step('글을 채우고 「등록」을 빠르게 두 번 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 기본본문 });
      await 보낸요청끝날때까지(page, '/api/posts', async () => {
        await 쓰기.등록.dblclick();
      });
      await verify('글쓰기 「등록」을 빠르게 두 번 눌러도 글이 하나만 생긴다', (await 제목으로찾은글번호들(page.request, 제목)).length, 1);
    });
  } finally {
    await 제목으로찾은글지우기(page.request, 제목);
    if (준비.회원) await 회원정리(page.request, 준비.회원);
  }
});
