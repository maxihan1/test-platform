import { defineCase, test, verify } from '@platform/kit';
import { 지원혜택화면 } from './pages/apply-benefits.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-014',
  name: '지원혜택 화면에 「지원혜택」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 지원혜택 = new 지원혜택화면(page);

  await test.step('지원혜택 화면을 연다', async () => {
    await 지원혜택.연다();
    await 지원혜택.제목.waitFor();
    await verify('지원혜택 화면에 「지원혜택」 제목이 보인다', await 지원혜택.제목.isVisible(), true, { blocker: true });
    await verify('「이전 영상」 · 「다음 영상」 버튼이 보인다', (await 지원혜택.이전영상버튼.isVisible()) && (await 지원혜택.다음영상버튼.isVisible()), true);
  });
});
