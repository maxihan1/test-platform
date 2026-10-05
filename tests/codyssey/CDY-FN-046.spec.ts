import { defineCase, test, verify } from '@platform/kit';
import { FAQ목록화면 } from './pages/faq-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-046',
  name: '「AI 네이티브」 탭을 누르면 카테고리 선택 상자에 「교육 수료」가 생긴다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const faq = new FAQ목록화면(page);

  await test.step('FAQ 목록 화면을 연다', async () => {
    await faq.연다();
  });

  await test.step('FAQ 목록 화면이 열렸는지 확인한다', async () => {
    await faq.제목.waitFor();
    await faq.질문들.first().waitFor();
    await verify('FAQ 화면에 「FAQ」 제목이 보인다', await faq.제목.isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 목록에서 「AI 네이티브」 탭을 누른다', async () => {
    await faq.네이티브탭.click();
    await faq.카테고리('교육과정 소개').waitFor({ state: 'attached' });
    await verify('「AI 네이티브」 탭을 누르면 카테고리 선택 상자에 「교육 수료」가 생긴다', (await faq.카테고리('교육 수료').count()) > 0, true);
  });
});
