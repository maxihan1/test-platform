import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-646',
  name: '「종류」를 고른 뒤 탭을 바꾸면 「종류」가 「전체」로 돌아간다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「운영자 작업」 탭이 선택돼 있다', await 화면.선택한탭('운영자 작업').isVisible(), true, { blocker: true });
  });

  await test.step('「종류」를 「제재」로 고른 뒤 「아이템 흐름」 탭을 누른다', async () => {
    await 화면.종류고르기('제재');
    await verify('「종류」가 「제재」로 골라져 있다', (await 화면.선택한종류.innerText()).trim(), '제재', { blocker: true });
    await 화면.탭누르기('아이템 흐름');
    await verify('「종류」를 고른 뒤 탭을 바꾸면 「종류」가 「전체」로 돌아간다', (await 화면.선택한종류.innerText()).trim(), '전체');
  });
});
