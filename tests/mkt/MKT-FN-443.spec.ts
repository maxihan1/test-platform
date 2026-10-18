import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-443',
  name: 'Tab 으로 옮기면 「로그인」 링크에 초점이 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면에서 Tab 으로 「로그인」 링크까지 옮긴다', async () => {
    await verify('Tab 으로 옮기면 「로그인」 링크에 초점이 간다', await 홈.탭으로옮기기(홈.머리글.로그인링크), true);
  });

  await test.step('초점이 간 「로그인」 링크에서 Enter 를 친다', async () => {
    await page.keyboard.press('Enter');
    await verify('초점이 간 링크에서 Enter 를 치면 로그인 화면으로 간다', await 나타났나(로그인.제목), true);
  });
});
