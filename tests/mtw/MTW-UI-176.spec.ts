import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-176',
  name: '프로필 핸들 옆 「?」를 누르면 「핸들은 이메일과 비슷합니다」 안내가 뜬다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await verify('프로필 머리에 핸들 버튼이 보인다', await 프로필.핸들.isVisible(), true, { blocker: true });
  });

  await test.step('프로필 핸들 옆 「?」를 누른다', async () => {
    await 프로필.핸들.click();
    const 떴다 = await 프로필.핸들안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('프로필 핸들 옆 「?」를 누르면 「핸들은 이메일과 비슷합니다」 안내가 뜬다', 떴다, true);
  });
});
