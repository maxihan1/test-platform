import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { type 새계정, 확인된새계정만들기 } from './helpers/signup.helper.js';
import { 기타환경설정화면 } from './pages/other-preferences.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-727',
  name: '새 계정으로 환경설정 「기타」를 열면 「타임라인의 부스트를 그룹화」가 켜져 있다',
  precondition: ['가입하고 관리자가 이메일 확인을 마친 새 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 기타환경설정화면(page);
  let 계정: 새계정 | undefined;

  await test.step('새 계정을 만들고 관리자가 이메일 확인을 마친다', async () => {
    계정 = await 확인된새계정만들기(page, params.adminId, params.adminPassword);
  });

  await test.step('새 계정으로 로그인해 있는지 확인한다', async () => {
    await 로그인하기(page, 계정?.이메일, 계정?.암호);
    await 설정.열기();
    await verify('환경설정 「기타」 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('새 계정으로 환경설정 「기타」를 연다', async () => {
    await verify('새 계정으로 환경설정 「기타」를 열면 「타임라인의 부스트를 그룹화」가 켜져 있다', await 설정.부스트그룹화.isChecked(), true);
  });
});
