import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 게시판검색화면 } from './pages/common-board.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-001',
  name: '머리글 로고와 「커뮤니티」 하위 메뉴를 쓰면 홈 화면과 분류별 게시판 목록이 열린다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);
  const 게시판 = new 게시판검색화면(page);

  await test.step('게시판 화면에서 로고 「데모마켓」을 누른다', async () => {
    await 게시판.열기();
    await 게시판.제목().waitFor();
    await 머리.로고().click();
    await 홈.인기글탭().waitFor();
    await verify('로고 「데모마켓」을 누르면 홈 화면으로 간다', new URL(page.url()).pathname, '/');
  });

  await test.step('「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 홈.공지팝업닫기();
    await 머리.메뉴링크('커뮤니티').hover();
    await 머리.하위메뉴('자유게시판').waitFor();
    await verify(
      '「커뮤니티」 메뉴에 마우스를 올리면 하위 메뉴 「자유게시판」 「질문게시판」 「후기게시판」이 펼쳐진다',
      [await 머리.하위메뉴('자유게시판').isVisible(), await 머리.하위메뉴('질문게시판').isVisible(), await 머리.하위메뉴('후기게시판').isVisible()],
      [true, true, true],
    );
  });

  await test.step('「커뮤니티」 메뉴에서 마우스를 치운다', async () => {
    await 홈.마우스치우기();
    await 머리.하위메뉴('자유게시판').waitFor({ state: 'hidden' });
    await verify(
      '마우스를 치우면 하위 메뉴가 닫힌다',
      [await 머리.하위메뉴('자유게시판').isVisible(), await 머리.하위메뉴('질문게시판').isVisible(), await 머리.하위메뉴('후기게시판').isVisible()],
      [false, false, false],
    );
  });

  await test.step('하위 메뉴 「질문게시판」을 누른다', async () => {
    await 머리.메뉴링크('커뮤니티').hover();
    await 머리.하위메뉴('질문게시판').click();
    await 게시판.제목().waitFor();
    const 주소 = new URL(page.url());
    await verify(
      '하위 메뉴 「질문게시판」을 누르면 「질문」 분류가 선택된 게시판 목록으로 간다',
      [주소.pathname, 주소.searchParams.get('category')],
      ['/board', '질문'],
    );
  });
});
