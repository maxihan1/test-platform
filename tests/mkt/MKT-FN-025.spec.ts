import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 로그아웃확인창 } from './pages/logout-confirm.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-025',
  name: '「로그아웃」을 누르면 확인 창이 뜨고 「확인」을 누르면 로그아웃되어 홈 화면으로 간다',
  precondition: ['회원으로 로그인해 있다', '로그아웃 확인 창이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 확인창 = new 로그아웃확인창(page);
  const 아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;

  try {
    await test.step('임시 회원을 가입시키고 로그인한다', async () => {
      await page.request.post('/api/auth/signup', {
        data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
      });
      await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
      await new 로그인화면(page).열기();
      await 머리.로그아웃버튼().waitFor();
      await verify('회원으로 로그인해 있다', await 머리.마이페이지링크().isVisible(), true, { blocker: true });
    });

    await test.step('「로그아웃」을 누른다', async () => {
      await 머리.로그아웃버튼().click();
      await 확인창.창().waitFor();
      await verify('「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다', await 확인창.문구().isVisible(), true, { blocker: true });
    });

    await test.step('「확인」을 누른다', async () => {
      await 확인창.확인버튼().click();
      await 머리.로그인링크().waitFor();
      await verify('「확인」을 누르면 로그아웃되어 홈 화면으로 간다', [new URL(page.url()).pathname, await 머리.로그아웃버튼().isVisible()], ['/', false]);
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
    await page.request.delete('/api/me');
  }
});
