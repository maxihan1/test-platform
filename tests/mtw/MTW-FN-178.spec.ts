import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기 } from './helpers/page-setup.helper.js';
import { 인증코드 } from './helpers/totp.helper.js';
import { 이단계인증설정화면 } from './pages/otp-settings.page.js';
import { 이단계인증코드화면 } from './pages/otp-login.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-178',
  name: '2단계 인증을 켠 계정으로 이메일과 암호를 통과하면 코드 입력 화면으로 간다',
  precondition: ['일회용 · 2단계 인증 계정에 2단계 인증을 켜 두었다'],
  params: z.object({
    otpId: z.string().describe('일회용 · 2단계 인증 계정 이메일').optional().meta({ secret: true, account: '일회용 · 2단계 인증' }),
    otpPassword: z.string().describe('일회용 · 2단계 인증 계정 암호').optional().meta({ secret: true, account: '일회용 · 2단계 인증' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 이단계인증설정화면(page);
  let 켬 = false;

  await test.step('일회용 · 2단계 인증 계정으로 로그인해 2단계 인증을 켠다', async () => {
    await 로그인하기(page, params.otpId, params.otpPassword);
    await 설정.열기();
    await 설정.설정시작하기(params.otpPassword ?? '');
    await verify('2단계 인증 설정 화면에 「활성화」 버튼이 보인다', await 설정.활성화.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('2단계 인증 설정에서 인증 코드를 넣고 「활성화」를 누른다', async () => {
      const 코드 = await 인증코드(page, await 설정.비밀코드읽기());
      await 설정.코드넣고활성화(코드);
      켬 = true;
      await 설정.열기();
      await verify('2단계 인증이 켜져 있다', await 설정.비활성화.isVisible(), true, { blocker: true });
    });

    await test.step('로그아웃하고 그 계정 이메일과 암호로 로그인한다', async () => {
      const 로그아웃창 = await 새창열기(page);
      try {
        const 로그인 = new 로그인화면(로그아웃창.page);
        await 로그인.열기();
        await 로그인.로그인(params.otpId ?? '', params.otpPassword ?? '');
        const 코드화면 = new 이단계인증코드화면(로그아웃창.page);
        const 떴다 = await 코드화면.코드칸.waitFor({ timeout: 10_000 }).then(() => true, () => false);
        await verify('2단계 인증을 켠 계정으로 이메일과 암호를 통과하면 코드 입력 화면으로 간다', 떴다, true);
      } finally {
        await 로그아웃창.창묶음.close();
      }
    });
  } finally {
    if (켬) {
      await 설정.열기();
      await 설정.끄기();
    }
  }
});
