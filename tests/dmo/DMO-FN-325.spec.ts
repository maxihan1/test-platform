import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 알림보내기, 회원번호, 회원조작 } from './helpers/ops-data.helper.js';
import { 변경기록화면 } from './pages/audit.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-325',
  name: '변경 기록에서 「메뉴」를 「회원」으로 고르면 메뉴가 「회원」인 줄만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 변경 = new 변경기록화면(page);

  await test.step('일회용 회원으로 변경 기록에 회원 줄과 알림 줄을 남긴다', async () => {
    const 일회용 = await 회원가입(request);
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await 회원조작(page, await 회원번호(page, 일회용.loginId), 'lock');
    await 알림보내기(page, 일회용.loginId, '변경 기록 시험 알림');
  });

  await test.step('관리자 계정으로 로그인해 있고 변경 기록에 다른 메뉴의 줄이 있음을 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 변경.열기();
    await verify('변경 기록에 메뉴 「알림」 줄이 있다', await 변경.칸들('메뉴').filter({ hasText: '알림' }).count() > 0, true, { blocker: true });
  });

  await test.step('「메뉴」를 「회원」으로 고른다', async () => {
    await 변경.메뉴고르기('회원');
    await 변경.칸들('메뉴').filter({ hasText: '알림' }).first().waitFor({ state: 'detached' });
    const 메뉴들 = (await 변경.칸들('메뉴').allInnerTexts()).map((글자) => 글자.trim());
    await verify('변경 기록에서 「메뉴」를 「회원」으로 고르면 메뉴가 「회원」인 줄만 보인다', [...new Set(메뉴들)].join(', '), '회원');
  });
});
