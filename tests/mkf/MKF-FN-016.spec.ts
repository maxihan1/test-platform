import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 세션아이디, 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-016',
  name: '「동의」를 누르면 쿠키 안내 띠가 사라진다',
  precondition: ['쿠키 안내에 동의한 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쿠키 = new 쿠키띠(page);
  const 홈 = new 홈화면(page);

  await test.step('쿠키 안내에 동의한 적 없는 비회원인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('쿠키 안내 띠가 있는 홈을 연다', async () => {
    await 방해막기(page, { 쿠키띠: false });
    await 홈.열기();
    await 쿠키.띠.waitFor();
    await verify('쿠키 안내 띠가 보인다', await 쿠키.띠.isVisible(), true, { blocker: true });
  });

  await test.step('쿠키 안내 띠의 「동의」를 누른다', async () => {
    await 쿠키.동의.click();
    await verify('「동의」를 누르면 쿠키 안내 띠가 사라진다', await 쿠키.띠.isVisible(), false);
  });

  await test.step('「동의」를 누른 뒤 홈을 새로 고친다', async () => {
    await page.reload();
    await 홈.제목.waitFor();
    await page.locator('dm-chat').waitFor({ state: 'attached' });
    await verify('「동의」를 누른 브라우저에서 홈을 새로 고치면 쿠키 안내 띠가 보이지 않는다', await 쿠키.띠.isVisible(), false);
  });
});
