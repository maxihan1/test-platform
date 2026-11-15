import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-401',
  name: 'Android 12 이상 폰의 「디스플레이」에 「시스템 동적 색상 적용」이 켜져 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    켜짐: z.boolean().describe('「시스템 동적 색상 적용」 스위치가 켜져 있는지').default(true),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 설정 = new 설정화면(driver);
  await test.step('Android 13 폰에서 새로 로그인한 앱의 설정 「디스플레이」를 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「디스플레이」 설정이 열린다', await 설정줄열기(driver, '디스플레이'), true, { blocker: true });
    await verify('Android 12 이상 폰의 「디스플레이」에 「시스템 동적 색상 적용」이 켜져 보인다', await 설정.켜졌나(0), expected.켜짐);
  });
});
