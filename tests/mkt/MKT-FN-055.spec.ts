import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-055',
  name: '타임세일 카운트다운이 「HH:MM:SS」 꼴이고 1초 뒤 1초 줄어든다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await page.clock.install({ time: new Date(2026, 9, 18, 12, 0, 0, 500) });
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('홈 화면을 열고 1초를 보낸다', async () => {
    await page.clock.pauseAt(new Date(2026, 9, 18, 12, 0, 5, 500));
    const 글 = (await 홈.타임세일시계.innerText()).trim();
    const 앞 = 홈.글을초로(글);
    await page.clock.runFor(1000);
    const 뒤 = await 홈.타임세일초();
    await verify(
      '타임세일 카운트다운이 「HH:MM:SS」 꼴이고 1초 뒤 1초 줄어든다',
      { 꼴: /^\d{2}:\d{2}:\d{2}$/.test(글), 줄어든초: 앞 - 뒤 },
      { 꼴: true, 줄어든초: 1 },
    );
  });
});
