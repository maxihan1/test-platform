import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 고객센터화면 } from './pages/support-faq.page.js';

type 질문글 = { category: string; question: string };

export const spec = defineCase({
  tcId: 'MKT-FN-027',
  name: '질문을 누르면 답이 펼쳐지고 다른 질문을 누르면 먼저 펼친 질문은 접힌다',
  precondition: ['비회원이다', 'FAQ 질문 하나가 펼쳐져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);
  const 머리 = new 머리글(page);
  const 질문들 = ((await (await page.request.get('/api/faq')).json()).items as 질문글[]).filter((글) => 글.category === '회원');
  const 첫질문 = 질문들[0]?.question ?? '';
  const 다른질문 = 질문들[1]?.question ?? '';

  await test.step('FAQ 질문 하나를 누른다', async () => {
    await 화면.열기();
    await 화면.질문버튼(첫질문).waitFor();
    await 머리.로그인링크().waitFor();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    await 화면.질문누르기(첫질문);
    await 화면.펼쳐진질문버튼(첫질문).waitFor();
    await verify('질문을 누르면 답이 펼쳐진다', await 화면.펼쳐진답들().isVisible(), true);
  });

  await test.step('다른 질문을 누른다', async () => {
    await verify('FAQ 질문 하나가 펼쳐져 있다', await 화면.펼쳐진질문버튼(첫질문).isVisible(), true, { blocker: true });
    await 화면.질문누르기(다른질문);
    await 화면.펼쳐진질문버튼(다른질문).waitFor();
    await verify('다른 질문을 누르면 먼저 펼친 질문은 접힌다', await 화면.질문버튼(첫질문).getAttribute('aria-expanded'), 'false');
  });
});
