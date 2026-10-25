import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 응답본문엿보기, 화면에글자가있나, 회원정보수정열기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-407',
  name: '로그인 응답 본문에 비밀번호가 평문으로 들어 있지 않다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 홈 = new 홈화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  const 엿봄 = await 응답본문엿보기(page, '**/api/auth/login');
  try {
    await test.step('일회용 회원으로 로그인하며 로그인 응답을 받는다', async () => {
      await 로그인.열기();
      await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
      await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
      await 로그인.적기(회원.loginId, 회원.password);
      await 로그인.로그인누르기();
      const 본문 = await 엿봄.본문();
      await verify('로그인 응답 본문에 비밀번호가 평문으로 들어 있지 않다', 본문.includes(회원.password), false);
    });
  } finally {
    await 엿봄.끝내기();
  }

  await test.step('회원정보 수정 화면을 확인한다', async () => {
    await 홈.그려질때까지();
    await verify('일회용 회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    await 회원정보수정열기(page, 회원.password);
    await verify('회원정보 수정 화면 어디에도 비밀번호가 평문으로 보이지 않는다', await 화면에글자가있나(page, 회원.password), false);
  });
});
