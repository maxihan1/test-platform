import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { FAQ화면 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-026',
  name: 'FAQ 화면에서 첫 질문의 제목을 누르면 그 아래에 답이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ화면(page);
  const 머리부 = new 머리(page);

  await test.step('FAQ 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 화면에서 첫 질문의 제목을 누른다', async () => {
    await 화면.첫질문제목.waitFor();
    await 화면.첫질문제목을누른다();
    await 화면.첫질문의답.waitFor({ state: 'attached' });
    await verify('FAQ 화면에서 첫 질문의 제목을 누르면 그 아래에 답이 보인다', await 화면.첫질문의답.isVisible(), true);
  });
});
