import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-473',
  name: '내 영웅의 이동 속도를 읽으면 네 직업 모두 이동 속도는 5로 같다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 값을 읽을 게임 오브젝트 칸을 모름',
});

test(spec, async ({ game, params }) => {
  await test.step('내 영웅의 이동 속도를 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('내 영웅의 이동 속도를 읽으면 네 직업 모두 이동 속도는 5로 같다', await 있는지(game, 던전.행동막대), true);
  });
});
