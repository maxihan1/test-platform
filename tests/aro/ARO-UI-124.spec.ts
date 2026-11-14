import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-124',
  name: '아이템 줄의 「빼기」를 누르면 그 줄이 빠진다',
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
  });

  await test.step('아이템 줄을 하나 더한 뒤 둘째 줄의 「빼기」를 누른다', async () => {
    await 화면.아이템줄채우기([
      { 이름: '체력 물약', 수량: 1 },
      { 이름: '녹슨 단검', 수량: 1 },
    ]);
    await verify('아이템 줄이 둘이다', await 화면.아이템이름칸들.count(), 2, { blocker: true });
    await 화면.둘째줄빼기();
    await verify('아이템 줄의 「빼기」를 누르면 그 줄이 빠진다', (await 화면.아이템이름값들()).join(', '), '체력 물약');
  });
});
