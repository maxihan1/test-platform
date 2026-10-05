import { defineCase, test, verify } from '@platform/kit';
import { 개인정보처리방침화면 } from './pages/terms-privacy.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-018',
  name: '개인정보처리방침 화면에 「개인정보처리방침」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 개인정보처리방침 = new 개인정보처리방침화면(page);

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 개인정보처리방침.연다();
    await 개인정보처리방침.제목.waitFor();
    await 개인정보처리방침.표들.first().waitFor();
    await verify('개인정보처리방침 화면에 「개인정보처리방침」 제목이 보인다', await 개인정보처리방침.제목.isVisible(), true, { blocker: true });
    await verify('본문에 표가 세 개 보인다', await 개인정보처리방침.표들.count(), 3);
  });
});
