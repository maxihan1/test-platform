import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림탭열기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

const 운영알림안보임 = defineCase({
  tcId: 'MTA-FN-319',
  name: '일반 회원이 알림을 열면 「reported」 · 「signed up」 운영 알림이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-034',
  name: '일반 회원에게 안 보이는 운영 알림',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [운영알림안보임],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);

  await test.case(운영알림안보임, async () => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('일반 회원으로 알림 탭을 연다', async () => {
      await 알림탭열기(driver);
    });
    await test.step('일반 회원 알림에서 운영 알림 자리를 확인한다', async () => {
      const 알림 = new 알림화면(driver);
      const 신고 = await verify('「reported」 알림이 보이지 않는다', await 알림.줄있나('reported', 3_000), false);
      const 가입 = await verify('「signed up」 알림이 보이지 않는다', await 알림.줄있나('signed up', 3_000), false);
      await verify('일반 회원이 알림을 열면 「reported」 · 「signed up」 운영 알림이 보이지 않는다', 신고 && 가입, true);
    });
  });
});
