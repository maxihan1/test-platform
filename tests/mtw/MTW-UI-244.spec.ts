import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-244',
  name: '팔로잉과 팔로워 화면에 「관계」 · 「계정 상태」 · 「계정 활동」 · 「정렬」 필터가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('팔로잉과 팔로워 화면을 연다', async () => {
    await 설정.열기('/relationships');
    const 관계 = await verify('「관계」 필터가 보인다', await 설정.글(/^관계$/).isVisible(), true);
    const 상태 = await verify('「계정 상태」 필터가 보인다', await 설정.글(/^계정 상태$/).isVisible(), true);
    const 활동 = await verify('「계정 활동」 필터가 보인다', await 설정.글(/^계정 활동$/).isVisible(), true);
    const 정렬 = await verify('「정렬」 필터가 보인다', await 설정.글(/^정렬$/).isVisible(), true);
    await verify('팔로잉과 팔로워 화면에 「관계」 · 「계정 상태」 · 「계정 활동」 · 「정렬」 필터가 보인다', 관계 && 상태 && 활동 && 정렬, true);
  });
});
