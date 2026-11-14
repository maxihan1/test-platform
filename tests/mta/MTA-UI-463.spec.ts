import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switch.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-463',
  name: '계정 전환 시트에 계정 목록(아바타 · 이름 · @이름@도메인, 체크형)이 보이고 고르면 그 계정으로 홈을 새로 연다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('「프로필」 탭을 길게 누른다', async () => {
    await 전환.열기();
    await verify('계정 전환 시트가 뜬다', await 전환.떴나(), true);
    const 줄 = await verify('계정 줄 「@이름@도메인」이 보인다', await 전환.계정줄보이나(), true);
    await 전환.계정줄누르기();
    const 홈열림 = await verify('고른 계정으로 홈이 새로 열린다', await 홈.떴나(), true);
    await verify('계정 전환 시트에 계정 목록(아바타 · 이름 · @이름@도메인, 체크형)이 보이고 고르면 그 계정으로 홈을 새로 연다', 줄 && 홈열림, true);
  }, { capture: true });
});
