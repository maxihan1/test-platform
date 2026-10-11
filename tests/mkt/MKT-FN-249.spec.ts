import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 자주묻는질문목록 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-249',
  name: 'FAQ 검색칸에 「배송」을 적으면 질문이나 답에 「배송」이 든 것만 보인다',
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

  await test.step('FAQ 검색칸에 「배송」을 적는다', async () => {
    const 기대 = (await 자주묻는질문목록(page.request))
      .filter((질문) => 질문.question.includes('배송') || 질문.answer.includes('배송'))
      .map((질문) => 질문.question)
      .sort();
    await 센터.검색칸.fill('배송');
    await 센터.질문들.nth(기대.length - 1).waitFor();
    await verify('FAQ 검색칸에 「배송」을 적으면 질문이나 답에 「배송」이 든 것만 보인다', (await 센터.질문글들()).sort(), 기대);
  });
});
