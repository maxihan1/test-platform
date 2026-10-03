import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고객센터 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-058',
  name: '지도 틀 안의 「확대」를 누르면 배율 숫자가 커지고 「축소」를 누르면 작아진다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터(page);
  const 배율값 = async (): Promise<number> => Number((await 센터.배율.innerText()).replace(/\D/g, ''));

  await test.step('고객센터 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 센터.열기();
    await 센터.배율.waitFor();
  });

  await test.step('지도 틀 안의 「확대」를 누른다', async () => {
    const 전 = await 배율값();
    await 센터.확대.click();
    await 센터.배율.filter({ hasNotText: `배율 ${전}` }).waitFor();
    await verify('「확대」를 누르면 지도 배율 숫자가 커진다', (await 배율값()) > 전, true);
  });

  await test.step('지도 틀 안의 「축소」를 누른다', async () => {
    const 전 = await 배율값();
    await 센터.축소.click();
    await 센터.배율.filter({ hasNotText: `배율 ${전}` }).waitFor();
    await verify('「축소」를 누르면 지도 배율 숫자가 작아진다', (await 배율값()) < 전, true);
  });
});
