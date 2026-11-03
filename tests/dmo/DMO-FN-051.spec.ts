import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 화면로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 세션읽기, 회원상태읽기 } from './helpers/users-flow.helper.js';
import { 회원번호, 회원조작 } from './helpers/ops-data.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-051',
  name: '잠긴 일회용 회원 계정으로 로그인하면 로그인되지 않고 잠금 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['상태 전이'],
  precondition: ['일회용 회원이 잠겨 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  let 일회용: 일회용회원;

  await test.step('일회용 회원을 만들어 잠근다', async () => {
    일회용 = await 회원가입(request);
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await 회원조작(page, await 회원번호(page, 일회용.loginId), 'lock');
  });

  await test.step('일회용 회원이 잠겨 있음을 확인한다', async () => {
    await verify('일회용 회원이 잠겨 있다', await 회원상태읽기(page, 일회용.loginId), 'locked', { blocker: true });
  });

  await test.step('잠긴 일회용 회원 계정으로 로그인한다', async () => {
    const 브라우저 = page.context().browser();
    if (!브라우저) throw new Error('브라우저를 찾지 못했다');
    const 창묶음 = await 브라우저.newContext();
    try {
      const 창 = await 창묶음.newPage();
      const 로그인 = new 로그인화면(창);
      await 로그인.열기();
      await 화면로그인(창, 일회용.loginId, 일회용.password);
      await 로그인.오류안내.filter({ hasText: /\S/ }).waitFor();
      const 로그인안됨 = await verify('로그인되지 않는다', (await 세션읽기(창)) === null, true);
      const 안내 = await verify('잠금 안내가 보인다', await 로그인.오류안내.isVisible(), true);
      await verify('잠긴 일회용 회원 계정으로 로그인하면 로그인되지 않고 잠금 안내가 보인다', 로그인안됨 && 안내, true);
    } finally {
      await 창묶음.close();
    }
  });
});
