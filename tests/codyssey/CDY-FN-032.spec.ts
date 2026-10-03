import { defineCase, test, verify } from '@platform/kit';

import { FAQ목록 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-032',
  name: 'FAQ 목록의 첫 질문 줄을 누르면 답변이 보인다',
  platforms: ['desktop'],
  precondition: ['FAQ 목록 화면이 열려 있다', '첫 질문 줄의 답변이 닫혀 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ목록(page);

  await test.step('FAQ 목록 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('FAQ 목록의 첫 질문 줄이 닫혀 있는지 확인한다', async () => {
    const 첫줄보임 = await 화면.첫질문줄
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록에 첫 질문 줄이 보인다', 첫줄보임, true, { blocker: true });

    await verify('FAQ 목록의 첫 질문 줄에 답변이 보이지 않는다', await 화면.첫질문답변.isVisible(), false, {
      blocker: true,
    });
  });

  await test.step('첫 질문 줄을 누른다', async () => {
    await 화면.첫질문줄_누르기();

    const 답변보임 = await 화면.첫질문답변
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록의 첫 질문 줄을 누르면 답변이 보인다', 답변보임, true);
  });
});
