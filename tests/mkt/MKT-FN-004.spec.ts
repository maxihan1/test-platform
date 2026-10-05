import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/common-board.page.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-004',
  name: '「커뮤니티」 메뉴에 마우스를 올리면 「자유게시판」 · 「질문게시판」 · 「후기게시판」 하위 메뉴가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);
  const 게시판 = new 게시판목록화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 화면에서 「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 쇼핑.머리글.커뮤니티에마우스올리기();
    await 쇼핑.머리글.하위메뉴.waitFor();
    await verify(
      '「커뮤니티」 메뉴에 마우스를 올리면 「자유게시판」 · 「질문게시판」 · 「후기게시판」 하위 메뉴가 보인다',
      (await 쇼핑.머리글.하위메뉴.getByRole('menuitem').allInnerTexts()).join(' · '),
      '자유게시판 · 질문게시판 · 후기게시판',
    );
  });

  await test.step('마우스를 머리글 밖으로 옮긴다', async () => {
    await 쇼핑.머리글밖으로마우스옮기기();
    await verify('하위 메뉴가 닫혀 보이지 않는다', await 쇼핑.머리글.하위메뉴.isVisible(), false);
  });

  await test.step('「커뮤니티」 메뉴에 다시 마우스를 올리고 「질문게시판」을 누른다', async () => {
    await 쇼핑.머리글.커뮤니티에마우스올리기();
    await 쇼핑.머리글.하위메뉴항목('질문게시판').click();
    await 게시판.표.waitFor();
    await verify('게시판 목록에 「질문」 탭이 선택되어 보인다', await 게시판.선택됨('질문'), true);
  });
});
