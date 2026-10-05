import { defineCase, test, verify } from '@platform/kit';
import { FAQ목록화면 } from './pages/faq-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-022',
  name: 'FAQ 화면에 「FAQ」 제목이 보인다',
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
    await faq.제목.waitFor();
    await faq.질문들.first().waitFor();
    await verify('FAQ 화면에 「FAQ」 제목이 보인다', await faq.제목.isVisible(), true, { blocker: true });
    await verify('「AI 올인원」 · 「AI 네이티브」 탭이 보인다', (await faq.올인원탭.isVisible()) && (await faq.네이티브탭.isVisible()), true);
    await verify('첫 쪽 목록에 질문이 10건 보인다', await faq.질문들.count(), 10);
  });
});
