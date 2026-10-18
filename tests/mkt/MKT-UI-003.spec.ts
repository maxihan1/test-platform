import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-003',
  name: '「커뮤니티」 메뉴에 마우스를 올리면 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면에서 「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 홈.커뮤니티에마우스올리기();
    await verify(
      '「커뮤니티」 메뉴에 마우스를 올리면 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
      {
        자유게시판: await 홈.머리글.하위메뉴항목('자유게시판').isVisible(),
        질문게시판: await 홈.머리글.하위메뉴항목('질문게시판').isVisible(),
        후기게시판: await 홈.머리글.하위메뉴항목('후기게시판').isVisible(),
      },
      { 자유게시판: true, 질문게시판: true, 후기게시판: true },
    );
  });

  await test.step('마우스를 「커뮤니티」 메뉴 밖으로 치운다', async () => {
    await 홈.메뉴밖으로마우스치우기();
    await verify('마우스를 메뉴 밖으로 치우면 하위 메뉴가 보이지 않는다', await 홈.머리글.하위메뉴.isVisible(), false);
  });
});
