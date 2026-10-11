import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-260',
  name: '상담 버튼을 누르면 상담 창이 열린다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상담 = new 상담창(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('홈 화면을 준비한다', async () => {
    await page.goto('/');
  });

  await test.step('상담 버튼이 보이는지 확인한다', async () => {
    await 상담.상담버튼.waitFor();
    await verify('상담 버튼이 보인다', await 상담.상담버튼.isVisible(), true, { blocker: true });
  });

  await test.step('상담 버튼을 누른다', async () => {
    await 상담.상담버튼.click();
    await verify('상담 버튼을 누르면 상담 창이 열린다', await 상담.창.isVisible(), true);
  });
});
