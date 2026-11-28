import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 계정마다최근검색 = defineCase({
  tcId: 'MTA-FN-646',
  name: '두 계정의 최근 검색을 비교하면 계정마다 따로 저장돼 있다',
  platforms: ['android'],
  precondition: ['계정이 둘 로그인돼 있다'],
  held: '보류 — 다른 앱 로그인 — 두 번째 계정을 붙이려면 Chrome 로그인을 거쳐야 한다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-064',
  name: '계정마다 최근 검색',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [계정마다최근검색],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);

  await test.case(계정마다최근검색, async () => {
    await test.step('두 계정의 최근 검색을 비교한다', async () => {
      await 홈에들어가기(driver);
      await verify('두 계정의 최근 검색을 비교하면 계정마다 따로 저장돼 있다', await 홈.떴나(), true);
    });
  });
});
