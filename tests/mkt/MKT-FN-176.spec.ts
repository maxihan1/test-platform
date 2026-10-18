import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 기본본문 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 글지우기 } from './helpers/data.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-176',
  name: '분류를 고르지 않고 등록하면 글이 등록되지 않고 글쓰기 화면에 머문다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};

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

    await test.step('분류를 고르지 않고 제목 · 본문을 채워 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 제목: 고유글자('분류 빠진 글'), 본문: 기본본문 });
      const 응답 = await 쓰기.등록하고응답받기();
      if (응답.status() === 201) 준비.글번호 = ((await 응답.json()) as { id: number }).id;
      await 알림.아무거나뜰때까지();
      await verify('분류를 고르지 않고 등록하면 글이 등록되지 않고 글쓰기 화면에 머문다', [응답.status() === 201, new URL(page.url()).pathname], [false, '/board/write']);
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(page.request, 준비.글번호);
    if (준비.회원) await 회원정리(page.request, 준비.회원);
  }
});
