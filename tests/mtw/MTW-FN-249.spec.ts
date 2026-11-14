import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 한국어로, 새창열기 } from './helpers/page-setup.helper.js';
import { 가입화면열기, 새계정값, 연지3초지날때까지 } from './helpers/signup.helper.js';
import { 이메일도메인차단화면 } from './pages/admin-email-domain-blocks.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-249',
  name: '차단된 도메인의 이메일로 「등록하기」를 누르면 「허용되지 않은 이메일 제공자입니다」가 보인다',
  precondition: ['관리자가 시험용 이메일 도메인을 차단해 두었다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
    차단할도메인: z.string().min(1).describe('차단할 이메일 도메인 — 메일 서버(MX)가 있고 다른 시험이 쓰지 않는 도메인').default('mailinator.com'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 가입화면(page);
  const 도메인 = params.차단할도메인;
  const 관리창 = await 새창열기(page);
  const 차단 = new 이메일도메인차단화면(관리창.page);
  let 차단함 = false;

  try {
    await test.step('관리자가 시험용 이메일 도메인을 차단한다', async () => {
      await 로그인하기(관리창.page, params.adminId, params.adminPassword);
      await 차단.열기();
      await verify('이메일 도메인 차단 화면에 도메인 칸이 보인다', await 차단.도메인칸.isVisible(), true, { blocker: true });
      await 차단.차단(도메인);
      차단함 = true;
    });

    await test.step('가입 화면에 차단된 도메인의 이메일을 넣고 「등록하기」를 누른다', async () => {
      await 한국어로(page);
      const 연시각 = await 가입화면열기(page);
      const 값 = 새계정값();
      await 가입.채우기({ 사용자명: 값.사용자명, 이메일: `${값.사용자명}@${도메인}`, 암호: 값.암호 });
      await 가입.동의하기();
      await 연지3초지날때까지(page, 연시각);
      await 가입.누르기();
      const 오류 = 가입.칸오류(가입.이메일칸).filter({ hasText: '허용되지 않은 이메일 제공자입니다' });
      const 떴다 = await 오류.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('차단된 도메인의 이메일로 「등록하기」를 누르면 「허용되지 않은 이메일 제공자입니다」가 보인다', 떴다, true);
    });
  } finally {
    try {
      if (차단함) await 차단.차단풀기(도메인);
    } finally {
      await 관리창.창묶음.close();
    }
  }
});
