import { defineCase, test, verify } from '@platform/kit';
import { 이용약관화면 } from './pages/terms-service.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-017',
  name: '이용약관 화면에 「이용약관」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 이용약관 = new 이용약관화면(page);

  await test.step('이용약관 화면을 연다', async () => {
    await 이용약관.연다();
    await 이용약관.제목.waitFor();
    await 이용약관.제1장.waitFor();
    await verify('이용약관 화면에 「이용약관」 제목이 보인다', await 이용약관.제목.isVisible(), true, { blocker: true });
    await verify('「제1조」 조항이 보인다', await 이용약관.제1조.isVisible(), true);
  });
});
