import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필설정화면 } from './pages/public-profile-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-196',
  name: '설정 > 공개 프로필 화면에 「새로운 프로필 편집 경험이 기다립니다」 배너와 「이동」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 공개프로필설정화면(page);

  await test.step('일반 회원으로 로그인하고 설정 > 공개 프로필 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 설정.열기();
    await verify('공개 프로필 화면에 「공개 프로필」 제목이 보인다', await 설정.제목.isVisible(), true, { blocker: true });
  });

  await test.step('설정 > 공개 프로필 화면을 연다', async () => {
    const 배너 = await verify('「새로운 프로필 편집 경험이 기다립니다」 배너가 보인다', await 설정.배너제목.isVisible(), true);
    const 이동 = await verify('배너에 「이동」이 보인다', await 설정.이동.isVisible(), true);
    await verify('설정 > 공개 프로필 화면에 「새로운 프로필 편집 경험이 기다립니다」 배너와 「이동」이 보인다', 배너 && 이동, true);
    await verify('공개 프로필 설정 화면에 편집 폼 칸은 없다', await 설정.편집칸.count(), 0);
  });
});
