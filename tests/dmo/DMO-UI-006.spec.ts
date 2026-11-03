import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-006',
  name: '운영 화면 머리줄에 「쇼핑몰 열기」 · 관리자 이름 · 「로그아웃」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 틀 = new 운영틀(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('관리자 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
  });

  await test.step('/ops 를 연다', async () => {
    await 대시보드.열기();
    await 틀.관리자이름.filter({ hasText: /\S/ }).waitFor();
    const 쇼핑몰열기 = await verify('머리줄에 「쇼핑몰 열기」가 보인다', await 틀.쇼핑몰열기.isVisible(), true);
    const 관리자이름 = await verify('머리줄에 관리자 이름이 보인다', await 틀.관리자이름.isVisible(), true);
    const 로그아웃 = await verify('머리줄에 「로그아웃」이 보인다', await 틀.로그아웃.isVisible(), true);
    await verify('운영 화면 머리줄에 「쇼핑몰 열기」 · 관리자 이름 · 「로그아웃」이 보인다', 쇼핑몰열기 && 관리자이름 && 로그아웃, true);
  });
});
