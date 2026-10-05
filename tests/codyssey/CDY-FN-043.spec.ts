import { defineCase, test, verify } from '@platform/kit';
import { FAQ목록화면 } from './pages/faq-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-043',
  name: '질문을 누르면 그 자리에서 답변이 펼쳐진다',
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

  await test.step('FAQ 목록에서 「코디세이는 어떤 프로그램인가요?」를 누른다', async () => {
    await faq.질문을누른다('코디세이는 어떤 프로그램인가요?');
    await faq.펼쳐진질문들.first().waitFor();
    await faq.답변('코디세이는 어떤 프로그램인가요?').waitFor();
    await verify('질문을 누르면 그 자리에서 답변이 펼쳐진다', await faq.답변('코디세이는 어떤 프로그램인가요?').isVisible(), true);
  });
});
