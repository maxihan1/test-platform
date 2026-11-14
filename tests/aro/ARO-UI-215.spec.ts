import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-215',
  name: '「기록」을 열면 「운영자 작업」 탭이 선택돼 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「기록」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「기록」 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify('「기록」을 열면 「운영자 작업」 탭이 선택돼 보인다', await 화면.선택한탭('운영자 작업').isVisible(), true);
  });

  await test.step('「아이템 흐름」 탭을 누른다', async () => {
    await 화면.탭누르기('아이템 흐름');
    await verify('「아이템 흐름」 탭 뒤 주소에 ?tab=items 가 붙는다', new URL(page.url()).searchParams.get('tab'), 'items');
  });
});
