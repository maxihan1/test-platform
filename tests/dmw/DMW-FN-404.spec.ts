import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-404',
  name: 'Tab 으로 「로그인」 버튼까지 옮겨 가면 초점이 그 버튼에 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 홈 = new 홈화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 아이디와 비밀번호를 적고 Tab 으로 「로그인」 버튼까지 옮긴다', async () => {
    await 로그인.적기(회원.loginId, 회원.password);
    await 로그인.탭으로버튼까지옮기기();
    await verify('Tab 으로 「로그인」 버튼까지 옮겨 가면 초점이 그 버튼에 있다', await 로그인.로그인버튼에초점인가(), true);
  });

  await test.step('「로그인」 버튼에 초점을 둔 채 Enter 를 친다', async () => {
    await page.keyboard.press('Enter');
    await 홈.그려질때까지();
    await verify('「로그인」 버튼에 초점을 두고 Enter 를 치면 로그인되어 홈 화면으로 간다', await 홈.머리.로그아웃.isVisible(), true);
  });
});
