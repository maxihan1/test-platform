import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 업데이트화면 } from './pages/software-updates.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-395',
  name: '업데이트 화면에 「버전」 · 「유형」 칸이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 업데이트 = new 업데이트화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('주소 /admin/software_updates 를 연다', async () => {
    await 업데이트.열기();
    const 버전 = await verify('「버전」 칸이 보인다', await 업데이트.버전칸.isVisible(), true);
    const 유형 = await verify('「유형」 칸이 보인다', await 업데이트.유형칸.isVisible(), true);
    await verify('업데이트 화면에 「버전」 · 「유형」 칸이 보인다', 버전 && 유형, true);
  });
});
