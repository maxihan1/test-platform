import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-221',
  name: '지도 「확대」를 누르면 배율 숫자가 1 커진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);

  await test.step('방해 요소를 막고 고객센터를 연다', async () => {
    await 방해막기(page);
    await 센터.열기();
  });

  await test.step('비회원인지 확인한다', async () => {
    await 센터.지도확대.waitFor();
    await verify('비회원이다', await 세션사용자(page.request), null, { blocker: true });
  });

  await test.step('지도 틀 안의 「확대」를 누른다', async () => {
    const 전 = await 센터.배율숫자();
    await 센터.지도확대.click();
    await verify('지도 「확대」를 누르면 배율 숫자가 1 커진다', (await 센터.배율숫자()) - 전, 1);
  });

  await test.step('지도 틀 안의 「축소」를 누른다', async () => {
    const 전 = await 센터.배율숫자();
    await 센터.지도축소.click();
    await verify('지도 「축소」를 누르면 배율 숫자가 1 작아진다', (await 센터.배율숫자()) - 전, -1);
  });
});
