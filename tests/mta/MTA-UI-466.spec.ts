import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switch.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-466',
  name: '「모든 계정 로그아웃하기」를 누르면 「모든 계정에서 로그아웃하시겠습니까?」(「로그아웃」 · 「취소」) 뒤 시작 화면으로 간다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 전환 = new 계정전환시트(driver);
  const 시작 = new 시작화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('계정 전환 시트에서 「모든 계정 로그아웃하기」를 누른다', async () => {
    await 전환.열기();
    await verify('계정 전환 시트가 뜬다', await 전환.떴나(), true);
    await 전환.모든계정로그아웃누르기();
    const 창 = await verify('확인 창 「모든 계정에서 로그아웃하시겠습니까?」가 보인다', await 전환.글보이나('모든 계정에서 로그아웃하시겠습니까?'), true);
    const 로그아웃 = await verify('확인 창 단추 「로그아웃」이 보인다', await 전환.로그아웃단추글(), '로그아웃');
    const 취소 = await verify('확인 창 단추 「취소」가 보인다', await 전환.취소단추글(), '취소');
    await 전환.로그아웃확인누르기();
    const 시작화면 = await verify('시작 화면으로 간다', await 시작.떴나(30_000), true);
    await verify('「모든 계정 로그아웃하기」를 누르면 「모든 계정에서 로그아웃하시겠습니까?」(「로그아웃」 · 「취소」) 뒤 시작 화면으로 간다', 창 && 로그아웃 && 취소 && 시작화면, true);
  }, { capture: true });
});
