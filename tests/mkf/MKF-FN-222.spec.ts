import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-222',
  name: '상담 버튼을 누르면 상담 창이 열린다',
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
    await 센터.상담.상담버튼.waitFor();
    await verify('비회원이다', await 세션사용자(page.request), null, { blocker: true });
  });

  await test.step('고객센터 오른쪽 아래 상담 버튼을 누른다', async () => {
    await 센터.상담.상담버튼.click();
    await verify('상담 버튼을 누르면 상담 창이 열린다', await 센터.상담.창.isVisible(), true);
  });
});
