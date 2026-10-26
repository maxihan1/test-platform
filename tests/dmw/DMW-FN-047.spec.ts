import { defineCase, test, verify } from '@platform/kit';

import { 시계멈추기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-047',
  name: '타임세일 카운트다운은 1초가 지나면 1초 줄어든다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

function 남은초(글: string): number {
  const [시, 분, 초] = 글.split(':').map(Number);
  return 시 * 3600 + 분 * 60 + 초;
}

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await page.clock.install();

  await test.step('홈 화면을 열고 1초를 보낸다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('카운트다운이 시각 꼴로 보인다', /^\d\d:\d\d:\d\d$/.test(await 홈.카운트다운값.innerText()), true, { blocker: true });
    await 시계멈추기(page);
    const 앞 = 남은초(await 홈.카운트다운값.innerText());
    await page.clock.runFor(1000);
    for (let 더 = 0; 더 < 10 && 남은초(await 홈.카운트다운값.innerText()) === 앞; 더 += 1) {
      await page.clock.runFor(10);
    }
    const 뒤 = 남은초(await 홈.카운트다운값.innerText());
    await verify('타임세일 카운트다운은 1초가 지나면 1초 줄어든다', 앞 - 뒤, 1);
  });

  await test.step('홈 화면 카운트다운 값을 확인한다', async () => {
    const 보인값 = 남은초(await 홈.카운트다운값.innerText());
    const 자정까지 = await page.evaluate(() => {
      const 지금 = new Date();
      const 자정 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate() + 1);
      return Math.floor((자정.getTime() - 지금.getTime()) / 1000);
    });
    const 차 = 보인값 - 자정까지;
    await verify('타임세일 카운트다운은 오늘 자정까지 남은 시간이다', 차 >= 0 && 차 <= 1, true);
  });
});
