import { defineCase, test, verify } from '@platform/kit';

import { 화면밖인가 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-025',
  name: '화면 너비가 768px 이면 머리글 메뉴가 햄버거 버튼 하나로 접혀 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await page.setViewportSize({ width: 768, height: 900 });

  await test.step('화면 너비를 768px 로 두고 홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
    const 햄버거 = await verify('머리글에 햄버거 버튼이 보인다', await 홈.머리.햄버거.isVisible(), true);
    const 접힘 = await verify('머리글 메뉴가 화면 밖으로 접혀 있다', await 화면밖인가(홈.머리.주메뉴), true);
    await verify('화면 너비가 768px 이면 머리글 메뉴가 햄버거 버튼 하나로 접혀 보인다', 햄버거 && 접힘, true);
  });
});
