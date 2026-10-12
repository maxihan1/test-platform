import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-023',
  name: '쿠키 안내에 동의한 뒤 다른 화면을 열면 쿠키 안내 띠가 보이지 않는다',
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쿠키 = new 쿠키띠(page);
  const 바닥 = new 바닥글(page);
  const 홈 = new 홈화면(page);

  await test.step('처음 방문한 브라우저인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 쿠키띠: false });
    await 홈.열기();
  });

  await test.step('쿠키 안내 띠가 보이는지 확인한다', async () => {
    await 쿠키.띠.waitFor();
    await verify('쿠키 안내 띠가 보인다', await 쿠키.띠.isVisible(), true, { blocker: true });
  });

  await test.step('쿠키 안내에 동의한 뒤 게시판 목록을 연다', async () => {
    await 쿠키.동의.click();
    await page.goto('/board');
    await 바닥.저작권.waitFor();
    await verify('쿠키 안내에 동의한 뒤 다른 화면을 열면 쿠키 안내 띠가 보이지 않는다', await 쿠키.띠.isVisible(), false);
  });
});
