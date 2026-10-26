import { defineCase, test, verify } from '@platform/kit';

import { 전환이끝날때까지, 화면밖인가, 화면안인가 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-026',
  name: '햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다',
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
    await verify('머리글 메뉴가 화면 왼쪽 밖에 접혀 있다', await 화면밖인가(홈.머리.주메뉴), true, { blocker: true });
  });

  await test.step('화면 너비 768px 에서 햄버거 버튼을 누른다', async () => {
    await 홈.머리.햄버거.click();
    await 전환이끝날때까지(홈.머리.주메뉴);
    await verify('햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다', await 화면안인가(page, 홈.머리.주메뉴), true);
  });
});
