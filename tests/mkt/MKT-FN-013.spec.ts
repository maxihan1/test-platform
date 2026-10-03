import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-013',
  name: '홈 배너는 4초마다 넘어가고 마우스를 올리면 멈추며 점을 누르면 그 장으로 간다',
  platforms: ['desktop'],
  precondition: ['홈 화면을 열기 전에 시계를 제어할 수 있다', '비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 현재장 = async (): Promise<string | null> => 홈.배너현재점.getAttribute('aria-label');

  await test.step('홈 화면을 열고 시계를 4초씩 앞으로 돌린다', async () => {
    await page.clock.install();
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 홈.배너점(3).waitFor();
    await 홈.배너현재점.waitFor();
    const 장들: (string | null)[] = [];
    for (let 번 = 0; 번 < 2; 번 += 1) {
      await page.clock.runFor(4000);
      장들.push(await 현재장());
    }
    await verify('홈 배너는 4초마다 자동으로 다음 장으로 넘어간다', 장들, ['2번 배너', '3번 배너']);
  });

  await test.step('홈 화면을 열고 시계를 4초씩 앞으로 돌려 마지막 장까지 간다', async () => {
    await 홈.열기();
    await 홈.배너점(3).waitFor();
    await 홈.배너현재점.waitFor();
    for (let 번 = 0; 번 < 3; 번 += 1) await page.clock.runFor(4000);
    await verify('마지막 장 다음에는 첫 장으로 돌아간다', await 현재장(), '1번 배너');
  });

  await test.step('배너에 마우스를 올리고 시계를 8초 앞으로 돌린다', async () => {
    const 전 = await 현재장();
    await 홈.배너영역.hover();
    await page.clock.runFor(8000);
    await verify('배너에 마우스를 올리면 자동 넘김이 멈춘다', await 현재장(), 전);
  });

  await test.step('배너에서 마우스를 치우고 시계를 4초 앞으로 돌린다', async () => {
    const 전 = Number((await 현재장())?.[0]);
    await 홈.마우스를치운다();
    await page.clock.runFor(4000);
    await verify('배너에서 마우스를 치우면 자동 넘김이 다시 시작한다', await 현재장(), `${(전 % 3) + 1}번 배너`);
  });

  await test.step('배너 아래 세 번째 점을 누른다', async () => {
    await 홈.배너점(3).click();
    await verify('배너 아래 점을 누르면 그 장으로 바로 간다', await 현재장(), '3번 배너');
  });
});
