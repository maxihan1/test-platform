import { defineCase, test, verify } from '@platform/kit';
import { 제목 } from './components/title.component.js';
import { 개인정보처리방침화면 } from './pages/terms-privacy.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-022',
  name: '개인정보처리방침 화면에 제목 「개인정보처리방침」이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 개인정보처리방침화면(page);
  const 제목부 = new 제목(page);

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 화면.연다();
    await 화면.현재위치.waitFor();
    await verify('개인정보처리방침 화면에 제목 「개인정보처리방침」이 보인다', await 제목부.대제목('개인정보처리방침').isVisible(), true);
  });
});
