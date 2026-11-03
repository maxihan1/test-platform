import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 토스트 } from './components/toast.component.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-067',
  name: '일회용 회원 줄의 「잠그기」를 누르면 토스트가 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 회원 = new 회원관리화면(page);
  const 토스트들 = new 토스트(page);
  let 일회용: 일회용회원;

  await test.step('일회용 회원을 만든다', async () => {
    일회용 = await 회원가입(request);
  });

  await test.step('관리자 계정으로 로그인해 있고 일회용 회원이 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 회원.열기();
    await 회원.검색하기(일회용.loginId);
    await verify('일회용 회원 줄이 보인다', await 회원.회원줄(일회용.loginId).count(), 1, { blocker: true });
  });

  await test.step('일회용 회원 줄의 「잠그기」를 누른다', async () => {
    await 회원.줄버튼(일회용.loginId, '잠그기').click();
    await 토스트들.목록.first().waitFor();
    await verify('일회용 회원 줄의 「잠그기」를 누르면 토스트가 뜬다', await 토스트들.목록.first().isVisible(), true);
  });
});
