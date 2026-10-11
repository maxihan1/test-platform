import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 게시판고른탭 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-001',
  name: '머리글 로고를 누르면 홈 화면으로 간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('게시판 목록 화면에서 머리글 로고를 누른다', async () => {
    await 방해막기(page);
    await page.goto('/board');
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 머리.로고.click();
    await 홈.제목.waitFor({ state: 'attached' });
    await verify(
      '머리글 로고를 누르면 홈 화면으로 간다',
      { 경로: new URL(page.url()).pathname, 홈화면: (await 홈.제목.count()) === 1 },
      { 경로: '/', 홈화면: true },
    );
  });

  await test.step('머리글 「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 머리.커뮤니티메뉴.hover();
    await verify(
      '「커뮤니티」 메뉴에 마우스를 올리면 하위 메뉴 「자유게시판」 · 「질문게시판」 · 「후기게시판」 이 보인다',
      {
        자유게시판: await 머리.하위메뉴항목('자유게시판').isVisible(),
        질문게시판: await 머리.하위메뉴항목('질문게시판').isVisible(),
        후기게시판: await 머리.하위메뉴항목('후기게시판').isVisible(),
      },
      { 자유게시판: true, 질문게시판: true, 후기게시판: true },
    );
  });

  await test.step('「커뮤니티」 메뉴에서 마우스를 치운다', async () => {
    await page.mouse.move(640, 650);
    await verify('「커뮤니티」 메뉴에서 마우스를 치우면 하위 메뉴가 보이지 않는다', await 머리.하위메뉴.isVisible(), false);
  });

  await test.step('하위 메뉴 「질문게시판」 을 누른다', async () => {
    await 머리.커뮤니티메뉴.hover();
    await 머리.하위메뉴항목('질문게시판').click();
    const 고른탭 = await 게시판고른탭(page);
    await verify(
      '하위 메뉴 「질문게시판」 을 누르면 「질문」 탭이 골라진 게시판 목록으로 간다',
      { 경로: new URL(page.url()).pathname, 고른탭 },
      { 경로: '/board', 고른탭: '질문' },
    );
  });
});
