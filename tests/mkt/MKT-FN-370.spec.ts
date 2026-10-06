import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-370',
  name: 'FAQ 질문을 누르면 답이 펼쳐진다',
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

  await test.step('FAQ 첫 질문을 누른다', async () => {
    await 고객.질문들.first().click();
    await verify('FAQ 질문을 누르면 답이 펼쳐진다', [await 고객.질문들.first().getAttribute('aria-expanded'), await 고객.펼친답들.count()], ['true', 1]);
  });

  await test.step('FAQ 둘째 질문을 누른다', async () => {
    await 고객.질문들.nth(1).click();
    await verify('다른 질문을 누르면 먼저 펼친 답은 접히고 하나만 펼쳐져 있다', await 고객.펼친질문글들(), [(await 고객.질문글들())[1]]);
  });

  await test.step('FAQ 「배송」 탭을 누른다', async () => {
    const 이전 = (await 고객.질문글들()).join(' · ');
    await 고객.분류탭('배송').click();
    await verify('「배송」 탭을 누르면 「배송」 탭이 선택되고 질문 목록이 바뀐다', [await 고객.선택됨('배송'), (await 고객.질문글들()).join(' · ') !== 이전], [true, true]);
  });
});
