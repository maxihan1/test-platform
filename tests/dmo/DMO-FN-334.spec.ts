import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 일회용비밀번호, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 세션읽기, 회원비밀번호바꾸기 } from './helpers/users-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 변경기록화면 } from './pages/audit.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-334',
  name: '비밀번호를 바꾼 변경 기록 줄에 새 비밀번호 글자가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 변경 = new 변경기록화면(page);
  let 일회용: 일회용회원;
  let 번호 = 0;

  await test.step('일회용 회원을 만든다', async () => {
    일회용 = await 회원가입(request);
  });

  await test.step('관리자 계정으로 로그인해 있고 일회용 회원이 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    번호 = await 회원번호(page, 일회용.loginId);
    await verify('일회용 회원이 있다', 번호 > 0, true, { blocker: true });
  });

  await test.step('일회용 회원 비밀번호를 바꾼 뒤 변경 기록에서 그 회원을 찾는다', async () => {
    const 새비밀번호 = 일회용비밀번호();
    await 회원비밀번호바꾸기(page, 번호, 새비밀번호);
    await 변경.열기();
    await 변경.검색하기(일회용.loginId);
    await 변경.대상줄(일회용.loginId).first().waitFor();
    const 줄글자 = (await 변경.줄들.allInnerTexts()).join('\n');
    await verify('비밀번호를 바꾼 변경 기록 줄에 새 비밀번호 글자가 보이지 않는다', 줄글자.includes(새비밀번호), false);
  });
});
