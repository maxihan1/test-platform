import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switch.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-415',
  name: '「로그아웃」을 누르면 「<@이름@도메인> 로그아웃?」(「로그아웃」 · 「취소」) 창이 뜬다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 전환 = new 계정전환시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  await test.step('계정 설정에서 「로그아웃」을 누른다', async () => {
    await 계정설정.줄누르기('로그아웃');
    const 열림 = await verify('로그아웃 확인 창이 뜬다', await 전환.로그아웃창떴나(), true);
    const 문구 = await verify('확인 창에 「<@이름@도메인> 로그아웃?」이 보인다', await 전환.글보이나('<@이름@도메인> 로그아웃?'), true);
    const 로그아웃 = await verify('확인 창 단추 「로그아웃」이 보인다', await 전환.로그아웃단추글(), '로그아웃');
    const 취소 = await verify('확인 창 단추 「취소」가 보인다', await 전환.취소단추글(), '취소');
    await verify('「로그아웃」을 누르면 「<@이름@도메인> 로그아웃?」(「로그아웃」 · 「취소」) 창이 뜬다', 열림 && 문구 && 로그아웃 && 취소, true);
    await 전환.확인.취소누르기();
  }, { capture: true });
});
