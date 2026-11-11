import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-293',
  name: '커스텀 에모지 화면에 「전체」 · 「로컬」 · 「리모트」 필터와 「짧은 코드」 · 「도메인」 칸, 「활성화」 · 「비활성화」 · 「삭제」 · 「복사」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「커스텀 에모지」 화면을 연다', async () => {
    await 목록.열기();
    const 전체 = await verify('「전체」 필터가 보인다', await 목록.전체필터.isVisible(), true);
    const 로컬 = await verify('「로컬」 필터가 보인다', await 목록.로컬필터.isVisible(), true);
    const 리모트 = await verify('「리모트」 필터가 보인다', await 목록.리모트필터.isVisible(), true);
    const 코드 = await verify('「짧은 코드」 칸이 보인다', await 목록.짧은코드칸.isVisible(), true);
    const 도메인 = await verify('「도메인」 칸이 보인다', await 목록.도메인칸.isVisible(), true);
    const 활성 = await verify('「활성화」가 보인다', await 목록.활성화.isVisible(), true);
    const 비활성 = await verify('「비활성화」가 보인다', await 목록.비활성화.isVisible(), true);
    const 삭제 = await verify('「삭제」가 보인다', await 목록.삭제.isVisible(), true);
    const 복사 = await verify('「복사」가 보인다', await 목록.복사.isVisible(), true);
    await verify('커스텀 에모지 화면에 「전체」 · 「로컬」 · 「리모트」 필터와 「짧은 코드」 · 「도메인」 칸, 「활성화」 · 「비활성화」 · 「삭제」 · 「복사」가 보인다', 전체 && 로컬 && 리모트 && 코드 && 도메인 && 활성 && 비활성 && 삭제 && 복사, true);
  });
});
