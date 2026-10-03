import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { FAQ화면 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-027',
  name: 'FAQ 화면에서 카테고리 「교육 일정 및 방식」을 고르고 검색하면 목록의 모든 질문이 그 카테고리다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ화면(page);
  const 머리부 = new 머리(page);
  const 카테고리 = '교육 일정 및 방식';

  await test.step('FAQ 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 화면에서 카테고리 「교육 일정 및 방식」을 고르고 「검색」을 누른다', async () => {
    const 걸러질제목 = await 화면.카테고리가다른첫질문제목(카테고리);
    await 화면.카테고리를고른다(카테고리);
    await 화면.검색한다();
    await 화면.질문제목(걸러질제목).waitFor({ state: 'detached' });
    await 화면.카테고리가같은질문항목들(카테고리).first().waitFor();
    await verify(
      'FAQ 화면에서 카테고리 「교육 일정 및 방식」을 고르고 검색하면 목록의 모든 질문이 그 카테고리다',
      await 화면.카테고리가다른질문항목들(카테고리).count(),
      0,
    );
  });
});
