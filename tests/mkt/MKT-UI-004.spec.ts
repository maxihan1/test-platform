import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-004',
  name: '하위 메뉴 「질문게시판」을 누르면 게시판 목록에서 「질문」 탭이 골라져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('하위 메뉴 「질문게시판」을 누른다', async () => {
    await 홈.커뮤니티에마우스올리기();
    await 홈.머리글.하위메뉴항목('질문게시판').click();
    await 이동.게시판목록그려질때까지();
    await verify('하위 메뉴 「질문게시판」을 누르면 게시판 목록에서 「질문」 탭이 골라져 있다', await 이동.게시판목록질문탭.isVisible(), true);
  });
});
