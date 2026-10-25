import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-297',
  name: 'FAQ 검색칸에 「비밀번호」를 적으면 질문이나 답에 「비밀번호」가 든 것만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().min(1).describe('FAQ 검색어 — 한 글자 이상').default('비밀번호'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 고객센터화면(page);
  let 모든항목: { question: string; answer: string }[] = [];

  await test.step('비회원으로 고객센터 화면을 연다', async () => {
    await 안내창막기(page);
    await 화면.열기();
    const 응답 = await page.request.get('/api/faq');
    모든항목 = ((await 응답.json()) as { items: { question: string; answer: string }[] }).items;
    await verify('고객센터 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('FAQ 검색칸에 「비밀번호」를 적는다', async () => {
    await 화면.검색하기(params.검색어);
    const 든것 = 모든항목.filter((항목) => 항목.question.includes(params.검색어) || 항목.answer.includes(params.검색어)).map((항목) => 항목.question);
    await verify('FAQ 검색칸에 「비밀번호」를 적으면 질문이나 답에 「비밀번호」가 든 것만 보인다', (await 화면.질문글들()).join(', '), 든것.join(', '));
  });
});
