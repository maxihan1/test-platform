import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-024',
  name: '「로그인 상태 유지」를 체크하면 로그인 쿠키가 7일간 유지되고 체크하지 않으면 세션 쿠키다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;
  const 로그인쿠키 = async () => (await page.context().cookies()).find((쿠키) => 쿠키.name === 'dm_sid');

  try {
    await test.step('로그인에 쓸 임시 회원을 가입시킨다', async () => {
      const 응답 = await page.request.post('/api/auth/signup', {
        data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
      });
      await verify('임시 회원이 가입돼 있다', 응답.ok(), true, { blocker: true });
    });

    await test.step('「로그인 상태 유지」를 체크하고 로그인한다', async () => {
      await 화면.열기();
      await 화면.로그인유지하고로그인하기(아이디, 비밀번호);
      await 머리.로그아웃버튼().waitFor();
      const 남은일수 = Math.round(((await 로그인쿠키())?.expires ?? 0) / 86400 - Date.now() / 86400000);
      await verify('「로그인 상태 유지」를 체크하고 로그인하면 로그인 쿠키가 7일간 유지된다', 남은일수, 7);
    });

    await test.step('「로그인 상태 유지」를 체크하지 않고 로그인한다', async () => {
      await page.context().clearCookies();
      await 화면.열기();
      await 화면.로그인하기(아이디, 비밀번호);
      await 머리.로그아웃버튼().waitFor();
      await verify('체크하지 않고 로그인하면 로그인 쿠키가 브라우저를 닫을 때 사라지는 세션 쿠키다', (await 로그인쿠키())?.expires, -1);
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
    await page.request.delete('/api/me');
  }
});
