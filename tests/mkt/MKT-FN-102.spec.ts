import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로그인화면보충 } from './pages/common-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-102',
  name: '관리자 화면에 일반 회원이 들어오면 「권한이 없습니다」가 보이고 비회원이 들어오면 로그인 화면으로 간다',
  precondition: ['일반 회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공통보충화면(page);
  const 로그인 = new 로그인화면(page);
  const 로그인보충 = new 로그인화면보충(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('「/admin」 화면을 연다', async () => {
      await 화면.열기('/admin');
      await new 머리글(page).장바구니링크().waitFor();
      await verify('일반 회원이 관리자 화면에 들어오면 「권한이 없습니다」가 보인다', await 화면.권한없음제목().isVisible(), true, { blocker: true });
    });

    await test.step('로그아웃한 뒤 「/admin」 화면을 연다', async () => {
      await page.context().clearCookies();
      await 화면.열기('/admin');
      await 로그인.로그인버튼().waitFor();
      await verify(
        '비회원이 관리자 화면에 들어오면 로그인 화면으로 간다',
        [await 화면.주소경로(), await 로그인보충.로그인제목().isVisible()],
        ['/login', true],
      );
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
    await page.request.delete('/api/me');
  }
});
