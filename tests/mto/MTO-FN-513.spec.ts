import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 업데이트화면 } from './pages/software-updates.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-513',
  name: 'Owner 가 /admin/software_updates 를 열면 업데이트 화면이 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 업데이트 = new 업데이트화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('주소 /admin/software_updates 를 연다', async () => {
    const 상태 = await 업데이트.열기();
    const 코드 = await verify('응답 코드가 200 이다', 상태, 200);
    const 권한 = await verify('「이 페이지를 표시할 권한이 없습니다.」가 보이지 않는다', await 관리.오류.권한없음.isVisible(), false);
    await verify('Owner 가 /admin/software_updates 를 열면 업데이트 화면이 열린다', 코드 && 권한, true);
  });
});
