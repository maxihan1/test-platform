import { defineCase, test, verify } from '@platform/kit';
import { FAQ목록화면 } from './pages/faq-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-044',
  name: '다른 질문을 누르면 앞서 펼친 답변이 접힌다',
  platforms: ['desktop'],
  precondition: ['비회원이다', 'FAQ 질문 하나가 펼쳐져 있다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const faq = new FAQ목록화면(page);

  await test.step('FAQ 목록에서 질문 「코디세이는 어떤 프로그램인가요?」를 눌러 펼친다', async () => {
    await faq.연다();
    await faq.질문을누른다('코디세이는 어떤 프로그램인가요?');
  });

  await test.step('FAQ 질문 하나가 펼쳐졌는지 확인한다', async () => {
    await faq.제목.waitFor();
    await faq.펼쳐진질문들.first().waitFor();
    await verify('FAQ 질문 하나가 펼쳐져 있다', await faq.펼쳐진질문들.count(), 1, { blocker: true });
  });

  await test.step('다른 질문 「누가 지원할 수 있나요?」를 누른다', async () => {
    await faq.질문을누른다('누가 지원할 수 있나요?');
    await faq.답변('누가 지원할 수 있나요?').waitFor();
    await verify('다른 질문을 누르면 앞서 펼친 답변이 접힌다', await faq.답변('코디세이는 어떤 프로그램인가요?').isVisible(), false);
  });
});
