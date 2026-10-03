import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고객센터 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-056',
  name: 'FAQ 질문을 눌러 답을 펼치고 검색칸에 글자를 적어 질문을 거른다',
  platforms: ['desktop'],
  precondition: ['비회원이다', 'FAQ 질문 하나가 펼쳐져 있다'],
  params: z.object({
    firstQuestion: z.string().min(1).describe('먼저 누르는 질문').default('비밀번호를 잊어버렸어요.'),
    secondQuestion: z.string().min(1).describe('다음에 누르는 질문').default('아이디를 바꿀 수 있나요?'),
    secondAnswer: z.string().min(1).describe('다음 질문의 답에 든 글자').default('아이디는 바꿀 수 없습니다'),
    keyword: z.string().min(1).describe('질문에 든 검색어').default('비밀번호'),
    missing: z.string().min(1).describe('어떤 질문에도 없는 검색어').default('zzqqxx'),
  }),
  expected: z.object({
    emptyText: z.string().describe('맞는 FAQ 가 없을 때 문구').default('검색 결과가 없습니다'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 센터 = new 고객센터(page);

  await test.step('고객센터 FAQ 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 센터.열기();
  });

  await test.step('FAQ 질문 하나를 누른다', async () => {
    await 센터.질문(params.firstQuestion).click();
    await 센터.펼친답들.first().waitFor();
    await verify('FAQ 질문을 누르면 답이 펼쳐진다', await 센터.펼친답들.first().isVisible(), true);
  });

  await test.step('다른 FAQ 질문을 누른다', async () => {
    await 센터.질문(params.secondQuestion).click();
    await 센터.펼친답들.filter({ hasText: params.secondAnswer }).waitFor();
    await verify('다른 질문을 누르면 먼저 펼친 질문은 접힌다', await 센터.펼친답들.count(), 1);
  });

  await test.step('FAQ 검색칸에 질문에 든 글자를 적는다', async () => {
    const res = await request.get('/api/faq');
    const items: { question: string; answer: string }[] = (await res.json()).items;
    const matched = items
      .filter((f) => f.question.includes(params.keyword) || f.answer.includes(params.keyword))
      .map((f) => f.question)
      .join(', ');
    await 센터.검색칸.fill(params.keyword);
    await 센터.질문(params.firstQuestion).waitFor();
    await 센터.질문(params.secondQuestion).waitFor({ state: 'detached' });
    const shown = (await 센터.질문들.allInnerTexts()).map((t) => t.replace(/\s*[＋－]$/, '')).join(', ');
    await verify('FAQ 검색칸에 글자를 입력하면 질문 · 답에 그 글자가 든 것만 걸러진다', shown, matched);
  });

  await test.step('FAQ 검색칸에 어떤 질문에도 없는 글자를 적는다', async () => {
    await 센터.검색칸.fill(params.missing);
    await 센터.질문들.first().waitFor({ state: 'detached' });
    await verify('맞는 FAQ 가 없으면 「검색 결과가 없습니다」가 보인다', await 센터.빈안내.innerText(), expected.emptyText);
  });
});
