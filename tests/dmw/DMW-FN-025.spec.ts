import { defineCase, test, verify } from '@platform/kit';

import { 쿠키안내 } from './components/cookie-bar.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-025',
  name: '쿠키 안내의 「동의」를 누르면 안내 띠가 사라진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 쿠키 = new 쿠키안내(page);
  await 안내창막기(page, { 쿠키: false });

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('쿠키 안내 띠가 보인다', await 쿠키.띠.isVisible(), true, { blocker: true });
  });

  await test.step('쿠키 안내의 「동의」를 누른다', async () => {
    await 쿠키.동의.click();
    await verify('쿠키 안내의 「동의」를 누르면 안내 띠가 사라진다', await 쿠키.띠.isVisible(), false);
  });

  await test.step('동의한 뒤 홈 화면을 새로 고친다', async () => {
    await page.reload();
    await 홈.그려질때까지();
    await verify('동의한 뒤 새로 고쳐도 쿠키 안내 띠가 다시 보이지 않는다', await 쿠키.띠.isVisible(), false);
  });
});
