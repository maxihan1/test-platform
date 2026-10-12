import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-384',
  name: '지도 배율이 5가 되면 「확대」가 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('고객센터 화면을 준비한다', async () => {
    await 센터.열기();
  });

  await test.step('고객센터 화면이 떴는지 확인한다', async () => {
    await 센터.질문들.first().waitFor();
    await verify('고객센터 화면에 질문이 보인다', await 센터.질문들.first().isVisible(), true, { blocker: true });
  });

  await test.step('지도 틀 안 「확대」를 배율 5까지 누른다', async () => {
    await 센터.지도확대.waitFor();
    for (let 번째 = 0; 번째 < 6 && (await 센터.배율숫자()) < 5; 번째 += 1) await 센터.지도확대.click();
    await verify('지도 배율이 5가 되면 「확대」가 눌리지 않는다', { 배율: await 센터.배율숫자(), 눌림: await 센터.지도확대.isEnabled() }, { 배율: 5, 눌림: false });
  });

  await test.step('지도 틀 안 「축소」를 배율 1까지 누른다', async () => {
    for (let 번째 = 0; 번째 < 6 && (await 센터.배율숫자()) > 1; 번째 += 1) await 센터.지도축소.click();
    await verify('지도 배율이 1이 되면 「축소」가 눌리지 않는다', { 배율: await 센터.배율숫자(), 눌림: await 센터.지도축소.isEnabled() }, { 배율: 1, 눌림: false });
  });
});
