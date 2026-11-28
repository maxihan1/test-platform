import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필편집으로 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 빈소개 = defineCase({
  tcId: 'MTA-UI-342',
  name: '자기소개가 비었으면 프로필 편집에 「Add bio」가 보인다',
  platforms: ['android'],
  precondition: ['가입 직후 계정으로 로그인해 프로필 편집을 열었다'],
  params: z.object({
    loginId: z.string().describe('가입 직후 계정 아이디').optional().meta({ secret: true, account: '가입 직후 계정' }),
    loginPassword: z.string().describe('가입 직후 계정 비밀번호').optional().meta({ secret: true, account: '가입 직후 계정' }),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-047',
  name: '가입 직후 계정 — 빈 자기소개',
  platforms: ['android'],
  precondition: ['가입 직후 계정으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [빈소개],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);

  await test.case(빈소개, async () => {
    await test.step('가입 직후 계정으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('빈 자기소개 자리를 확인한다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await verify('자기소개가 비었으면 프로필 편집에 「Add bio」가 보인다', await 편집.소개추가줄있나(10_000), true);
    });
  });
});
