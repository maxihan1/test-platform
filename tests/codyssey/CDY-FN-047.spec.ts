import { defineCase, test, verify } from '@platform/kit';
import { FAQ목록화면 } from './pages/faq-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-047',
  name: '카테고리 「교육 수료」로 검색하면 보이는 질문의 카테고리가 모두 「교육 수료」다',
  platforms: ['desktop'],
  precondition: ['비회원이다', 'FAQ 「AI 네이티브」 탭이 열려 있다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const faq = new FAQ목록화면(page);

  await test.step('FAQ 목록에서 「AI 네이티브」 탭을 연다', async () => {
    await faq.연다();
    await faq.네이티브탭.click();
  });

  await test.step('FAQ 「AI 네이티브」 탭이 열렸는지 확인한다', async () => {
    await faq.카테고리('교육과정 소개').waitFor({ state: 'attached' });
    await faq.질문들.nth(2).waitFor();
    await verify('FAQ 「AI 네이티브」 탭이 골라져 있다', await faq.골라진네이티브탭.isVisible(), true, { blocker: true });
  });

  await test.step('카테고리에서 「교육 수료」를 고르고 「검색」을 누른다', async () => {
    await faq.카테고리를고른다('교육 수료');
    await faq.검색.검색버튼.click();
    await faq.질문들.nth(2).waitFor({ state: 'detached' });
    await faq.카테고리가이름인질문들('교육 수료').first().waitFor();
    const 전체 = await faq.질문들.count();
    await verify(
      '카테고리 「교육 수료」로 검색하면 보이는 질문의 카테고리가 모두 「교육 수료」다',
      전체 > 0 && (await faq.카테고리가이름인질문들('교육 수료').count()) === 전체,
      true,
    );
  });
});
