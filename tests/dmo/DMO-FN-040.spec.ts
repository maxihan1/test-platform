import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-040',
  name: '회원 관리 화면에서 「다음」을 누르면 쪽 표시가 2쪽으로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 회원이 20명보다 많다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 회원 = new 회원관리화면(page);

  await test.step('관리자 계정으로 로그인해 있고 회원이 20명보다 많음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 회원.열기();
    await verify('회원이 20명보다 많다', (await 회원.총인원수()) > 20, true, { blocker: true });
  });

  await test.step('회원 관리 화면에서 「다음」을 누른다', async () => {
    await 회원.다음쪽으로();
    await verify('회원 관리 화면에서 「다음」을 누르면 쪽 표시가 2쪽으로 바뀐다', await 회원.쪽번호(), '2');
  });

  await test.step('2쪽 표의 줄을 센다', async () => {
    await verify('2쪽 표에 회원 20명이 보인다', await 회원.줄들.count(), 20);
  });

  await test.step('「이전」을 누른다', async () => {
    await 회원.이전쪽으로();
    await verify('「이전」을 누르면 쪽 표시가 1쪽으로 돌아온다', await 회원.쪽번호(), '1');
  });
});
