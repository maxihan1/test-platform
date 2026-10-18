import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-101',
  name: '첫 페이지에서는 「이전」이 눌리지 않는다',
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

  await test.step('게시판 목록 1쪽의 「이전」을 확인한다', async () => {
    await verify('첫 페이지에서는 「이전」이 눌리지 않는다', await 목록.이전.isDisabled(), true);
  });

  await test.step('게시판 목록 마지막 쪽을 연다', async () => {
    const 글자들 = await 목록.쪽이동버튼들.allInnerTexts();
    await 목록.쪽누르기(Number(글자들.at(-2)));
    await verify('마지막 페이지에서는 「다음」이 눌리지 않는다', await 목록.다음.isDisabled(), true);
  });
});
