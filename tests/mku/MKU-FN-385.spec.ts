import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 자주묻는질문목록 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-385',
  name: '「주문/결제」 탭을 고른 채 검색해도 다른 분류의 맞는 질문까지 보인다',
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

  await test.step('「주문/결제」 탭을 고른 채 FAQ 검색칸에 「배송」을 적는다', async () => {
    const 맞는질문 = (await 자주묻는질문목록(page.request)).filter((질문) => 질문.question.includes('배송') || 질문.answer.includes('배송'));
    const 다른분류 = 맞는질문.filter((질문) => 질문.category !== '주문/결제').map((질문) => 질문.question).sort();
    await 센터.탭들.filter({ hasText: '주문/결제' }).click();
    await 센터.검색칸.fill('배송');
    await 센터.질문들.nth(맞는질문.length - 1).waitFor();
    const 보이는질문 = await 센터.질문글들();
    await verify('「주문/결제」 탭을 고른 채 검색해도 다른 분류의 맞는 질문까지 보인다', 다른분류.filter((질문) => 보이는질문.includes(질문)).sort(), 다른분류);
  });
});
