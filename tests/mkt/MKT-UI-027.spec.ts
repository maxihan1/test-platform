import { defineCase, test, verify } from '@platform/kit';

import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-027',
  name: '장바구니가 비어 있으면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  precondition: ['장바구니가 비어 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('장바구니 화면을 연다', async () => {
      const 담긴줄 = ((await (await page.request.get('/api/cart')).json()) as { items: unknown[] }).items;
      await verify('장바구니가 비어 있다', 담긴줄.length, 0, { blocker: true });
      await 장바구니.열기();
      await 장바구니.불러오는중표시().waitFor({ state: 'detached' });
      await verify('장바구니가 비어 있으면 「장바구니가 비어 있습니다」가 보인다', await 장바구니.빈장바구니문구().isVisible(), true);
      await verify('「쇼핑하러 가기」 버튼이 보인다', await 장바구니.쇼핑하러가기버튼().isVisible(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
