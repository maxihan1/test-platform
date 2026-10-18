import { defineCase, test, verify } from '@platform/kit';
import { 공지와설문만막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-024',
  name: '화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
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
    await verify(
      '화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
      {
        안내문: await 홈.바닥글.쿠키띠.getByText('서비스 개선을 위해 쿠키를 사용합니다.').isVisible(),
        동의버튼: await 홈.바닥글.쿠키동의.isVisible(),
      },
      { 안내문: true, 동의버튼: true },
    );
  });
});
