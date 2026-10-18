import { defineCase, test, verify } from '@platform/kit';
import { 공지와설문만막기 } from './helpers/browser.helper.js';
import { 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-029',
  name: '쿠키 안내 띠의 「동의」를 누르면 띠가 사라진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('처음 방문한 브라우저로 홈 화면을 연다', async () => {
    await 공지와설문만막기(page);
    await 홈.열기();
    await 홈.바닥글.쿠키띠.waitFor();
    await verify('쿠키 동의 기록이 없다', await page.evaluate(() => localStorage.getItem('dm_cookie_ok') === null), true, { blocker: true });
  });

  await test.step('쿠키 안내 띠의 「동의」를 누른다', async () => {
    await 홈.쿠키동의누르기();
    await verify('쿠키 안내 띠의 「동의」를 누르면 띠가 사라진다', await 사라졌나(홈.바닥글.쿠키띠), true);
  });

  await test.step('같은 브라우저로 홈 화면을 다시 연다', async () => {
    await 홈.열기();
    await 홈.바닥글.그려질때까지();
    await verify('동의한 브라우저로 다시 열면 쿠키 안내 띠가 나오지 않는다', await 홈.바닥글.쿠키띠.isVisible(), false);
  });
});
