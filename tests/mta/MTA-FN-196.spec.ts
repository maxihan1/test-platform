import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈으로, 프로필열기 } from './helpers/nav.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-196',
  name: '「누군가를 언팔로우할 때 묻기」를 켜고 「팔로우 해제」를 누르면 「님을 언팔로우 할까요?」 창이 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    묻는글: z.string().describe('언팔로우 확인 창 글').default('님을 언팔로우 할까요?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 설정 = new 설정화면(driver);
  const 창 = new 확인창(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('「누군가를 언팔로우할 때 묻기」를 켜고 팔로우 중인 사람 「팔로우 해제」를 누른다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「동작」 설정이 열린다', await 설정줄열기(driver, '동작'), true, { blocker: true });
    if (!(await 설정.켜졌나(2))) await 설정.스위치바꾸기(2);
    await verify('「누군가를 언팔로우할 때 묻기」가 켜진다', await 될때까지(driver, () => 설정.켜졌나(2), 5_000), true, { blocker: true });
    await 홈으로(driver);
    await 프로필열기(driver, 'minjun_dev');
    await 프로필.동작누르기();
    await verify('「누군가를 언팔로우할 때 묻기」를 켜고 「팔로우 해제」를 누르면 「님을 언팔로우 할까요?」 창이 뜬다', await 뜰때까지(driver, 창.안의글자(expected.묻는글), 10_000), true);
    await 창.취소();
  });
});
