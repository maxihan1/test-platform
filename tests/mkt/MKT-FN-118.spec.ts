import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { FAQ읽기 } from './helpers/home.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-118',
  name: 'FAQ 질문을 누르면 그 답이 펼쳐진다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  const 머리 = new 머리글(page);

  await test.step('FAQ 첫 질문을 누른다', async () => {
    await 방해막기(page);
    await 고객센터.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 회원분류 = (await FAQ읽기(page.request)).filter((글) => 글.category === '회원');
    await 고객센터.질문들.first().click();
    await verify(
      'FAQ 질문을 누르면 그 답이 펼쳐진다',
      { 펼침: await 고객센터.질문들.first().getAttribute('aria-expanded'), 답: await 고객센터.열린답.allInnerTexts() },
      { 펼침: 'true', 답: [회원분류[0]?.answer] },
    );
  });

  await test.step('FAQ 두 번째 질문을 누른다', async () => {
    await 고객센터.질문들.nth(1).click();
    await verify(
      'FAQ 에서 다른 질문을 누르면 먼저 펼친 답은 접힌다',
      { 첫째: await 고객센터.질문들.first().getAttribute('aria-expanded'), 둘째: await 고객센터.질문들.nth(1).getAttribute('aria-expanded') },
      { 첫째: 'false', 둘째: 'true' },
    );
  });

  await test.step('FAQ 검색칸에 「배송」 을 적는다', async () => {
    await 고객센터.검색칸.fill('배송');
    const 맞는질문 = (await FAQ읽기(page.request)).filter((글) => 글.question.includes('배송') || 글.answer.includes('배송')).map((글) => 글.question);
    await verify(
      'FAQ 검색칸에 「배송」 을 적으면 질문이나 답에 「배송」 이 든 것만 보인다',
      (await 고객센터.질문글들()).join(' | '),
      맞는질문.join(' | '),
    );
  });

  await test.step('지도 틀 안의 「축소」 를 누른다', async () => {
    const 전 = await 고객센터.배율읽기();
    await 고객센터.지도축소.click();
    const 후 = await 고객센터.배율읽기();
    await verify('지도 틀 안의 「축소」 를 누르면 배율 숫자가 하나 줄어든다', { 줄어든수: 전 - 후 }, { 줄어든수: 1 });
  });
});
