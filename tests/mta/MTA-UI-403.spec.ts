import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-403',
  name: '「민감하다고 표시된 미디어를 숨기기」 스위치가 켜져 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    켜짐: z.boolean().describe('「민감하다고 표시된 미디어를 숨기기」 스위치가 켜져 있는지').default(true),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 설정 = new 설정화면(driver);
  await test.step('새로 로그인한 앱의 설정 「디스플레이」를 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「디스플레이」 설정이 열린다', await 설정줄열기(driver, '디스플레이'), true, { blocker: true });
    await verify('「민감하다고 표시된 미디어를 숨기기」 스위치가 켜져 보인다', await 설정.켜졌나(2), expected.켜짐);
  });
});
