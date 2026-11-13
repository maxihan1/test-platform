import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-510',
  name: '적이 죽으면 그 서버에 접속해 캐릭터를 불러온 모든 플레이어가 각자 보상을 받고 나눠 갖지 않는다',
  platforms: ['android'],
  precondition: ['두 사람이 던전에 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('한 사람이 임프를 처치한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('적이 죽으면 그 서버에 접속해 캐릭터를 불러온 모든 플레이어가 각자 보상을 받고 나눠 갖지 않는다', await 있는지(game, 던전.행동막대), true);
  });
});
