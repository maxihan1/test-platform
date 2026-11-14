import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 개인정보와도달화면 } from './pages/privacy-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-237',
  name: '개인정보와 도달 화면에 「새로운 프로필 편집 경험이 기다립니다」 안내와 「이동」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 개인정보와도달화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('개인정보와 도달 화면을 연다', async () => {
    await 설정.열기();
    const 안내 = await verify('「새로운 프로필 편집 경험이 기다립니다」 안내가 보인다', await 설정.새프로필편집안내.isVisible(), true);
    const 이동 = await verify('「이동」이 보인다', await 설정.새프로필편집이동.isVisible(), true);
    await verify('개인정보와 도달 화면에 「새로운 프로필 편집 경험이 기다립니다」 안내와 「이동」이 보인다', 안내 && 이동, true);
  });
});
