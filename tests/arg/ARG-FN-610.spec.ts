import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-610',
  name: '처치 경험치에 파티 배율 1 + 0.1 × (파티 인원 − 1)을 곱한다(4명이면 1.3배)',
  platforms: ['android'],
  precondition: ['네 사람 파티다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('임프를 처치하고 경험치를 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('처치 경험치에 파티 배율 1 + 0.1 × (파티 인원 − 1)을 곱한다(4명이면 1.3배)', await 있는지(game, 던전.행동막대), true);
  });
});
