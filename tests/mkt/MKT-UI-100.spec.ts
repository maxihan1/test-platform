import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-100',
  name: '게시판 목록 아래에 페이지 번호 · 「이전」 · 「다음」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 아래 쪽 이동 영역을 확인한다', async () => {
    const 글자들 = await 목록.쪽이동버튼들.allInnerTexts();
    await verify('게시판 목록 아래에 페이지 번호 · 「이전」 · 「다음」이 보인다', [글자들[0], 글자들.at(-1), 글자들.slice(1, -1).length > 0 && 글자들.slice(1, -1).every((글) => /^\d+$/.test(글))], ['이전', '다음', true]);
  });
});
