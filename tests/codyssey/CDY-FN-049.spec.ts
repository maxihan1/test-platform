import { defineCase, test, verify } from '@platform/kit';
import { FAQ목록화면 } from './pages/faq-list.page.js';
import { FAQ상세화면 } from './pages/faq-detail.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-049',
  name: 'FAQ 상세에서 「목록」을 누르면 「AI 올인원」 탭이 골라진 FAQ 목록이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const faq = new FAQ목록화면(page);
  const faq상세 = new FAQ상세화면(page);

  await test.step('FAQ 상세(pstartSn=13028)를 연다', async () => {
    await faq상세.연다('13028');
  });

  await test.step('FAQ 상세 화면이 열렸는지 확인한다', async () => {
    await faq상세.제목.waitFor();
    await faq상세.목록버튼.waitFor();
    await verify('FAQ 상세 화면에 「FAQ」 제목이 보인다', await faq상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 상세(pstartSn=13028)에서 「목록」을 누른다', async () => {
    await faq상세.목록버튼.click();
    await faq.제목.waitFor();
    await faq.질문들.first().waitFor();
    await verify(
      'FAQ 상세에서 「목록」을 누르면 「AI 올인원」 탭이 골라진 FAQ 목록이 보인다',
      (await faq.골라진올인원탭.isVisible()) && (await faq.질문들.first().isVisible()),
      true,
    );
  });
});
