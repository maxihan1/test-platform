import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-003',
  name: '머리글 「커뮤니티」에 마우스를 올리면 하위 메뉴 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('머리글 「커뮤니티」에 마우스를 올린다', async () => {
    await 홈.머리.메뉴열기();
    await 홈.머리.커뮤니티.hover();
    const 자유 = await verify('하위 메뉴 「자유게시판」이 보인다', await 홈.머리.자유게시판.isVisible(), true);
    const 질문 = await verify('하위 메뉴 「질문게시판」이 보인다', await 홈.머리.질문게시판.isVisible(), true);
    const 후기 = await verify('하위 메뉴 「후기게시판」이 보인다', await 홈.머리.후기게시판.isVisible(), true);
    await verify(
      '머리글 「커뮤니티」에 마우스를 올리면 하위 메뉴 「자유게시판」 · 「질문게시판」 · 「후기게시판」이 보인다',
      자유 && 질문 && 후기,
      true,
    );
  });

  await test.step('「커뮤니티」에서 마우스를 치운다', async () => {
    await 홈.마우스치우기();
    await verify('「커뮤니티」에서 마우스를 치우면 하위 메뉴가 보이지 않는다', await 홈.머리.자유게시판.isVisible(), false);
  });
});
