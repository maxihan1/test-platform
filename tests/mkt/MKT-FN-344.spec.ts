import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-344',
  name: 'FAQ 검색에 맞는 것이 0건이면 「검색 결과가 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    없는검색어: z.string().min(1).describe('FAQ 검색어 — 어떤 질문이나 답에도 없는 글자').default('zzzz'),
    하나만맞는검색어: z.string().min(1).describe('FAQ 검색어 — 질문이나 답 하나에만 있는 낱말').default('환불은'),
  }),
  expected: null,
  techniques: ['경계값 분석'],
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

  await test.step('FAQ 검색칸에 「zzzz」를 적는다', async () => {
    await 고객센터.검색하기(params.없는검색어);
    await verify(
      'FAQ 검색에 맞는 것이 0건이면 「검색 결과가 없습니다」가 보인다',
      { 안내: await 고객센터.검색없음.isVisible(), 질문수: await 고객센터.질문들.count() },
      { 안내: true, 질문수: 0 },
    );
  });

  await test.step('FAQ 검색칸에 「환불은」을 적는다', async () => {
    await 고객센터.검색하기(params.하나만맞는검색어);
    await verify(
      'FAQ 검색에 맞는 것이 1건이면 그 질문 하나가 보이고 안내 문구는 없다',
      { 질문수: await 고객센터.질문들.count(), 질문에든글자: (await 고객센터.질문글들()).every((글) => 글.includes(params.하나만맞는검색어)), 안내없음: !(await 고객센터.검색없음.isVisible()) },
      { 질문수: 1, 질문에든글자: true, 안내없음: true },
    );
  });
});
