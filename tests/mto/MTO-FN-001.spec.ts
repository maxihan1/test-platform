import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-001',
  name: 'Owner 가 「서버 설정」 · 「역할」 · 「웹훅」 · 「이의제기」 주소를 열면 화면마다 제목이 보인다',
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

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「서버 설정」 · 「역할」 · 「웹훅」 · 「이의제기」 주소를 차례로 연다', async () => {
    await 관리.열기('/admin/settings');
    const 화면1 = await verify('「서버 설정」 화면에 제목이 보인다', await 관리.제목이('서버 설정').isVisible(), true);
    await 관리.열기('/admin/roles');
    const 화면2 = await verify('「역할」 화면에 제목이 보인다', await 관리.제목이('역할').isVisible(), true);
    await 관리.열기('/admin/webhooks');
    const 화면3 = await verify('「웹훅」 화면에 제목이 보인다', await 관리.제목이('웹훅').isVisible(), true);
    await 관리.열기('/admin/disputes/appeals');
    const 화면4 = await verify('「이의제기」 화면에 제목이 보인다', await 관리.제목이('이의제기').isVisible(), true);
    await verify('Owner 가 「서버 설정」 · 「역할」 · 「웹훅」 · 「이의제기」 주소를 열면 화면마다 제목이 보인다', 화면1 && 화면2 && 화면3 && 화면4, true);
  });
});
