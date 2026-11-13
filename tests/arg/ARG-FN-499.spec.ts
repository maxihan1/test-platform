import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-499',
  name: '적을 공격하고 피해와 회복 숫자 색을 확인하면 피해 숫자는 적이 받은 피해는 흰색, 내가 받은 피해는 빨간색, 회복은 초록색 「+」이다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('적을 공격하고 피해와 회복 숫자 색을 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('적을 공격하고 피해와 회복 숫자 색을 확인하면 피해 숫자는 적이 받은 피해는 흰색, 내가 받은 피해는 빨간색, 회복은 초록색 「+」이다', await 있는지(game, 던전.행동막대), true);
  });
});
