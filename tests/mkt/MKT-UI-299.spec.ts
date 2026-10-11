import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-299',
  name: '고객센터 아래쪽 「오시는 길」에 지도 틀이 보인다',
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

  await test.step('고객센터를 연다', async () => {
    await 센터.열기();
    await 센터.지도틀.waitFor();
    await verify('고객센터 아래쪽 「오시는 길」에 지도 틀이 보인다', [await 센터.지도틀.isVisible(), await 센터.오시는길제목.isVisible(), await 센터.지도가제목아래인가()], [true, true, true]);
  });
});
