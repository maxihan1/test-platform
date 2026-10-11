import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-248',
  name: 'FAQ 다른 질문을 누르면 먼저 펼친 답이 접힌다',
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

  await test.step('FAQ 첫 질문을 펼친 뒤 둘째 질문을 누른다', async () => {
    const 첫째 = 센터.질문들.first();
    await 첫째.click();
    await (await 센터.답변(첫째)).waitFor();
    await 센터.질문들.nth(1).click();
    await verify('FAQ 다른 질문을 누르면 먼저 펼친 답이 접힌다', await 센터.답변이보이는가(첫째), false);
  });
});
