import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인돼있는가, 모두받은지급찾기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-456',
  name: '우편이 모두 「받음」인 지급 줄을 보면 「회수」 버튼이 없다',
  techniques: ['결정 테이블'],
  precondition: ['모든 우편이 「받음」이고 회수하지 않은 지급이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);

  let 번호 = 0;

  await test.step('운영자 계정으로 로그인하고 우편이 모두 받음인 지급을 찾는다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
    번호 = (await 모두받은지급찾기(page)) ?? 0;
    await verify('모든 우편이 「받음」이고 회수하지 않은 지급이 있다', 번호 > 0, true, { blocker: true });
  });

  await test.step('「지급 · 회수」 화면에서 그 지급 줄을 찾는다', async () => {
    await 화면.열기();
    await verify('그 지급 줄이 지급 이력에 보인다', await 화면.행이보일때까지쪽넘기기(번호), true, { blocker: true });
  });

  await test.step('그 지급 줄을 본다', async () => {
    await verify('우편이 모두 「받음」인 지급 줄을 보면 「회수」 버튼이 없다', await 화면.번호행의회수버튼(번호).count(), 0);
  });
});
