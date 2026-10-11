import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-268',
  name: '「아이디 검색」에 아이디를 적으면 그 회원 줄만 보인다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 관리자 = new 관리자화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자계정.loginId, 관리자계정.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정 세션이 있다', (await 내정보(page.request)).loginId === 관리자계정.loginId, true, { blocker: true });
  });

  await test.step('「아이디 검색」 칸에 「user2」를 적는다', async () => {
    await 관리자.열기();
    await 관리자.회원관리탭.click();
    await 관리자.회원표.waitFor();
    await 관리자.아이디검색.fill('user2');
    await 관리자.회원줄들.filter({ hasNotText: 'user2' }).first().waitFor({ state: 'detached' });
    const 아이디들 = await 관리자.회원아이디들();
    await verify('「아이디 검색」에 아이디를 적으면 그 회원 줄만 보인다', 아이디들.length > 0 && 아이디들.every((값) => 값.includes('user2')), true);
  });
});
