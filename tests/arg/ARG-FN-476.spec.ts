import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-476',
  name: '휴대폰에서 적을 누르면 기본 공격을 한다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 바닥과 적을 누를 오브젝트 주소를 모름(좌표 누르기는 케이스에 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('던전에서 적을 누른다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('휴대폰에서 적을 누르면 기본 공격을 한다', await 있는지(game, 던전.행동막대), true);
  });
});
