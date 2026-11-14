import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-116',
  name: '아이템 줄 수량 칸은 처음 「1」, 「골드」 칸은 처음 「0」으로 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
  });

  await test.step('「지급 · 회수」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    const 수량 = await verify('아이템 줄 수량 칸이 처음 「1」이다', await 화면.수량칸들.first().inputValue(), '1');
    const 골드 = await verify('「골드」 칸이 처음 「0」이다', await 화면.골드칸.inputValue(), '0');
    await verify('아이템 줄 수량 칸은 처음 「1」, 「골드」 칸은 처음 「0」으로 보인다', 수량 && 골드, true);
  });
});
