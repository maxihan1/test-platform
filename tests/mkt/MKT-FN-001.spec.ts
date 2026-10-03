import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 게시판목록 } from './pages/board-list.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-001',
  name: '머리글의 로고와 「커뮤니티」 하위 메뉴를 누르거나 올리면 알맞은 화면이 나온다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '게시판 목록 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 목록 = new 게시판목록(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 홈.쿠키띠를치운다();
    await 목록.열기();
    await verify('게시판 목록 화면이 열려 있다', new URL(page.url()).pathname, '/board', { blocker: true });
  });

  await test.step('머리글에서 로고 「데모마켓」을 누른다', async () => {
    await 머리.로고.click();
    await page.waitForLoadState('load');
    await verify('로고 「데모마켓」을 누르면 홈 화면으로 간다', new URL(page.url()).pathname, '/');
  });

  await test.step('머리글에서 「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 홈.공지팝업을치운다();
    await 목록.열기();
    await 머리.커뮤니티.hover();
    await 머리.하위메뉴('자유게시판').waitFor();
    const 이름들 = await 머리.주메뉴.getByRole('menuitem').allInnerTexts();
    await verify(
      '「커뮤니티」 메뉴에 마우스를 올리면 하위 메뉴 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
      이름들.join(', '),
      '자유게시판, 질문게시판, 후기게시판',
    );
  });

  await test.step('머리글에서 「커뮤니티」 메뉴에서 마우스를 치운다', async () => {
    await 홈.마우스를치운다();
    await 머리.하위메뉴('자유게시판').waitFor({ state: 'hidden' });
    await verify('「커뮤니티」 메뉴에서 마우스를 치우면 하위 메뉴가 보이지 않는다', await 머리.주메뉴.getByRole('menuitem').count(), 0);
  });

  await test.step('하위 메뉴 「자유게시판」을 누른다', async () => {
    await 머리.커뮤니티.hover();
    await 머리.하위메뉴('자유게시판').click();
    await 목록.표.waitFor();
    await verify('하위 메뉴 「자유게시판」을 누르면 분류 「자유」가 선택된 게시판 목록으로 간다', await 목록.분류탭('자유').getAttribute('aria-selected'), 'true');
  });
});
