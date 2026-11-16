import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-539',
  name: '「모든 계정에서 로그아웃하시겠습니까?」 창에서 「로그아웃」을 누르면 시작 화면이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    창문구: z.string().describe('로그아웃 확인 창 문구').default('모든 계정에서 로그아웃하시겠습니까?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 계정전환시트(driver);
  const 창 = new 확인창(driver);
  const 시작 = new 시작화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('계정 전환 시트에서 「모든 계정 로그아웃하기」를 누르고 「로그아웃」을 누른다', async () => {
    await 시트.열기();
    await 시트.모두로그아웃누르기();
    await verify('「모든 계정에서 로그아웃하시겠습니까?」 창이 보인다', await 뜰때까지(driver, 창.안의글자(expected.창문구), 10_000), true, { blocker: true });
    await 창.확인();
    await verify('「모든 계정에서 로그아웃하시겠습니까?」 창에서 「로그아웃」을 누르면 시작 화면이 보인다', await 시작.그려질때까지(), true);
  });
});
