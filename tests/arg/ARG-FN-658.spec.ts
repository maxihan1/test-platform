import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-658',
  name: '임프를 처치하고 경험치를 읽으면 경험치 배율은 1 + 장착 장비 경험치 획득 합이다(1.0 ~ 1.2)',
  platforms: ['android'],
  precondition: ['「현자의 목걸이」를 장착했다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('임프를 처치하고 경험치를 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('임프를 처치하고 경험치를 읽으면 경험치 배율은 1 + 장착 장비 경험치 획득 합이다(1.0 ~ 1.2)', await 있는지(game, 던전.행동막대), true);
  });
});
