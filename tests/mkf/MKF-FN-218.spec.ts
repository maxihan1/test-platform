import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-218',
  name: 'FAQ 질문을 누르면 그 답이 펼쳐진다',
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
    await 센터.질문들.first().waitFor();
    await verify('비회원이다', await 세션사용자(page.request), null, { blocker: true });
  });

  await test.step('FAQ 첫 질문을 누른다', async () => {
    const 질문 = 센터.질문들.first();
    await 질문.click();
    await verify('FAQ 질문을 누르면 그 답이 펼쳐진다', await 센터.답변이보이는가(질문), true);
  });

  await test.step('FAQ 첫 질문을 펼친 채 두 번째 질문을 누른다', async () => {
    const 첫째 = 센터.질문들.first();
    await 센터.질문들.nth(1).click();
    await verify('다른 FAQ 질문을 누르면 먼저 펼친 답이 접힌다', await 센터.답변이보이는가(첫째), false);
  });
});
