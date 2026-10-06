import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-373',
  name: 'FAQ 검색칸에 글자를 적으면 버튼 없이 질문이나 답에 그 글자가 든 것만 바로 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 고객 = new 고객센터화면(page);

  await test.step('고객센터 화면을 연다', async () => {
    await 안내창끄기(page);
    await 고객.열기();
    await verify('비회원이다', await 고객.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 검색칸에 「배송」을 적는다', async () => {
    await 고객.검색칸.fill('배송');
    await verify(
      'FAQ 검색칸에 글자를 적으면 버튼 없이 질문이나 답에 그 글자가 든 것만 바로 보인다',
      [await 고객.검색버튼.count(), await 고객.항목마다검색어가들었나('배송')],
      [0, true],
    );
  });
});
