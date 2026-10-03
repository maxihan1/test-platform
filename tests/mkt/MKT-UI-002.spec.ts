import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-002',
  name: '회원의 홈 머리글에 「{이름}님」 · 「마이페이지」 · 「로그아웃」이 보인다',
  precondition: ['회원으로 로그인해 있다 · 장바구니가 비어 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('홈 화면을 연다', async () => {
      const 장바구니응답 = page.waitForResponse('**/api/cart');
      await 홈.열기();
      await 머리.장바구니링크().waitFor();
      await 장바구니응답;
      await verify('머리글에 「{이름}님」이 보인다', await 머리.이름표시().isVisible(), true, { blocker: true });
      await verify(
        '머리글에 「마이페이지」 링크와 「로그아웃」 버튼이 보인다',
        [await 머리.마이페이지링크().isVisible(), await 머리.로그아웃버튼().isVisible()],
        [true, true],
      );
      await verify('일반 회원의 머리글에는 「관리자」 링크가 보이지 않는다', await 머리.관리자링크().isVisible(), false);
      await verify('장바구니가 비어 있으면 숫자 배지가 보이지 않는다', await 머리.장바구니배지().isVisible(), false);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
