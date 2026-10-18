import { defineCase, test, verify } from '@platform/kit';
import { 공지와설문만막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-026',
  name: '동의하기 전 쿠키 안내 띠가 화면 아래 내용 위에 겹쳐 보인다',
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

  await test.step('홈 화면 아래쪽 쿠키 안내 띠 자리를 확인한다', async () => {
    await verify('동의하기 전 쿠키 안내 띠가 화면 아래 내용 위에 겹쳐 보인다', await 홈.쿠키띠가내용위에겹치나(), true);
  });
});
