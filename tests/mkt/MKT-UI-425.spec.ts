import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { API로그인, 계정값 } from './helpers/account.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-425',
  name: '관리자 홈 머리글에 「관리자」 링크가 보인다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 관리자 계정 비밀번호',
});

test(spec, async ({ page, params }) => {
  const 관리자 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await API로그인(page.request, 관리자.loginId, 관리자.password);
  });

  await test.step('로그인한 관리자인지 확인한다', async () => {
    await verify('로그인한 관리자가 맞다', (await 세션아이디(page)) === 관리자.loginId, true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 머리.로그아웃.waitFor();
    await verify('관리자 홈 머리글에 「관리자」 링크가 보인다', await 머리.관리자.isVisible(), true);
  });
});
