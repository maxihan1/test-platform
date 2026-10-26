import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인쿠키만료일수, 브라우저다시열기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-094',
  name: '「로그인 상태 유지」를 켜고 로그인하면 로그인 쿠키가 7일 뒤 만료된다',
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

  await test.step('「로그인 상태 유지」를 켜고 로그인한다', async () => {
    await 로그인.적기(회원.loginId, 회원.password);
    await 로그인.상태유지.check();
    await 로그인.로그인누르기();
    await 홈.그려질때까지();
    await verify('로그인되어 머리글에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('「로그인 상태 유지」를 켜고 로그인하면 로그인 쿠키가 7일 뒤 만료된다', await 로그인쿠키만료일수(page), 7);
  });

  await test.step('브라우저를 닫았다 다시 열고 홈 화면을 연다', async () => {
    const 다시연 = await 브라우저다시열기(page);
    try {
      const 새홈 = new 홈화면(다시연.새쪽);
      await 새홈.열기();
      await verify('「로그인 상태 유지」를 켜고 로그인하면 브라우저를 닫았다 열어도 머리글에 「로그아웃」이 보인다', await 새홈.머리.로그아웃.isVisible(), true);
    } finally {
      await 다시연.닫기();
    }
  });
});
