import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 자주묻는질문목록 } from './helpers/shop-tools.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-219',
  name: 'FAQ 검색칸에 글자를 적으면 질문이나 답에 그 글자가 든 FAQ 만 보인다',
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

  await test.step('FAQ 검색칸에 「비밀번호」를 적는다', async () => {
    const 기대 = (await 자주묻는질문목록(page.request))
      .filter((질문) => 질문.question.includes('비밀번호') || 질문.answer.includes('비밀번호'))
      .map((질문) => 질문.question)
      .sort();
    await 센터.검색칸.fill('비밀번호');
    await 센터.질문들.nth(기대.length - 1).waitFor();
    await verify('FAQ 검색칸에 글자를 적으면 질문이나 답에 그 글자가 든 FAQ 만 보인다', (await 센터.질문글들()).sort(), 기대);
  });
});
