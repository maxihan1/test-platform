import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 기본본문, 상세글번호 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 글지우기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-199',
  name: '글을 등록하면 방금 쓴 글의 상세로 가고 토스트 「등록되었습니다」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 글 = new 게시글화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};
  const 제목 = 고유글자('등록 확인');

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

    await test.step('분류 · 제목 · 본문을 채우고 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 기본본문 });
      await 쓰기.등록.click();
      const 토스트글 = await (await 알림.아무거나뜰때까지()).innerText();
      await 글.댓글불러올때까지();
      준비.글번호 = 상세글번호(page.url());
      await verify('글을 등록하면 방금 쓴 글의 상세로 가고 토스트 「등록되었습니다」가 나온다', [await 글.제목.innerText(), 토스트글], [제목, '등록되었습니다']);
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(page.request, 준비.글번호);
    if (준비.회원) await 회원정리(page.request, 준비.회원);
  }
});
