import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-098',
  name: '비밀번호 칸에서 Enter 를 치면 로그인되어 홈 화면으로 간다',
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

  await test.step('비밀번호 칸에서 Enter 를 친다', async () => {
    await 로그인.적기(회원.loginId, 회원.password);
    await 로그인.비밀번호.press('Enter');
    await 홈.그려질때까지();
    const 홈화면보임 = await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true);
    const 로그인됨 = await verify('머리글에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true);
    await verify('비밀번호 칸에서 Enter 를 치면 로그인되어 홈 화면으로 간다', 홈화면보임 && 로그인됨, true);
  });
});
