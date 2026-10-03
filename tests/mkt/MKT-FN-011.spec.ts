import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-011',
  name: '카운트다운이 1초마다 줄어들고 종료 시각은 그날 자정이다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

const 초로 = (시각: string): number => {
  const [시, 분, 초] = 시각.split(':').map(Number);
  return (시 ?? 0) * 3600 + (분 ?? 0) * 60 + (초 ?? 0);
};

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 기준 = new Date('2026-10-03T23:00:00');
  await page.clock.install({ time: 기준 });
  await page.clock.pauseAt(new Date(기준.getTime() + 1000));

  await test.step('1초 간격으로 카운트다운을 두 번 읽는다', async () => {
    await 홈.열기();
    const 첫째 = await 홈.카운트다운시간().innerText();
    await page.clock.runFor(1000);
    const 둘째 = await 홈.카운트다운시간().innerText();
    await verify('카운트다운이 1초마다 줄어든다', 초로(첫째) - 초로(둘째), 1);
  });

  await test.step('카운트다운의 남은 시간을 읽는다', async () => {
    await verify('카운트다운의 종료 시각은 그날 자정이다', await 홈.카운트다운시간().innerText(), '00:59:58');
  });
});
