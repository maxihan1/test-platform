import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-342',
  name: 'FAQ 검색칸에 「배송비」를 적으면 질문이나 답에 「배송비」가 든 질문만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().min(1).describe('FAQ 검색어 — 질문이나 답에 든 낱말').default('배송비'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 고객센터 = new 고객센터화면(page);

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 고객센터.열기();
  });

  await test.step('고객센터 화면이 열렸는지 확인한다', async () => {
    await verify('FAQ 질문 목록이 보인다', (await 고객센터.질문들.count()) > 0, true, { blocker: true });
  });

  await test.step('FAQ 검색칸에 「배송비」를 적는다', async () => {
    const 응답 = await page.request.get('/api/faq');
    const 전체 = ((await 응답.json()) as { items: { question: string; answer: string }[] }).items;
    const 맞는질문 = 전체.filter((글) => 글.question.includes(params.검색어) || 글.answer.includes(params.검색어)).map((글) => 글.question);
    await 고객센터.검색하기(params.검색어);
    const 보이는질문 = await 고객센터.질문글들();
    await verify(
      'FAQ 검색칸에 「배송비」를 적으면 질문이나 답에 「배송비」가 든 질문만 보인다',
      { 보이는질문: 보이는질문.slice().sort().join(', '), 하나이상: 보이는질문.length > 0 },
      { 보이는질문: 맞는질문.slice().sort().join(', '), 하나이상: true },
    );
  });
});
