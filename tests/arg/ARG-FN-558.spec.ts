import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-558',
  name: '임프를 처치하고 퀘스트 진행을 읽으면 처치 퀘스트는 파티 · 장비와 관계없이 1마리에 1 오른다',
  platforms: ['android'],
  precondition: ['「현자의 목걸이」를 장착하고 파티에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('임프를 처치하고 퀘스트 진행을 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('임프를 처치하고 퀘스트 진행을 읽으면 처치 퀘스트는 파티 · 장비와 관계없이 1마리에 1 오른다', await 있는지(game, 던전.행동막대), true);
  });
});
