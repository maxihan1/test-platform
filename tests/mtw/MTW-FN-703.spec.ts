import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { type 새계정, 확인된새계정만들기 } from './helpers/signup.helper.js';
import { 개인정보와도달화면 } from './pages/privacy-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-703',
  name: '새 계정으로 개인정보와 도달을 열면 「검색엔진에 프로필 페이지 포함하기」가 켜져 있다',
  precondition: ['가입하고 관리자가 이메일 확인을 마친 새 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 개인정보와도달화면(page);
  let 계정: 새계정 | undefined;

  await test.step('새 계정을 만들고 관리자가 이메일 확인을 마친다', async () => {
    계정 = await 확인된새계정만들기(page, params.adminId, params.adminPassword);
  });

  await test.step('새 계정으로 로그인해 있는지 확인한다', async () => {
    await 로그인하기(page, 계정?.이메일, 계정?.암호);
    await 설정.열기();
    await verify('개인정보와 도달 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('새 계정으로 개인정보와 도달을 연다', async () => {
    await verify('새 계정으로 개인정보와 도달을 열면 「검색엔진에 프로필 페이지 포함하기」가 켜져 있다', await 설정.검색엔진.isChecked(), true);
  });
});
