import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-037',
  name: '홈 글 탭에 「인기글」 · 「최신글」이 보이고 「인기글」이 선택되어 있다',
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

  await test.step('홈 화면 글 탭을 확인한다', async () => {
    const 인기 = await verify('글 탭에 「인기글」이 보인다', await 홈.인기글탭.isVisible(), true);
    const 최신 = await verify('글 탭에 「최신글」이 보인다', await 홈.최신글탭.isVisible(), true);
    const 선택 = await verify('「인기글」이 선택되어 있다', await 홈.인기글탭.getAttribute('aria-selected'), 'true');
    await verify('홈 글 탭에 「인기글」 · 「최신글」이 보이고 「인기글」이 선택되어 있다', 인기 && 최신 && 선택, true);
  });
});
