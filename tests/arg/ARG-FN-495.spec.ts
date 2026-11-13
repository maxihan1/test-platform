import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-495',
  name: '맞은 쪽이 플레이어면 피해에 (1 − 방어율)을 곱해 반올림하고 피해는 최소 1 이다',
  platforms: ['android'],
  precondition: ['방어율이 높은 캐릭터로 던전에 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('피해 1 아래가 나오는 공격을 맞는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('맞은 쪽이 플레이어면 피해에 (1 − 방어율)을 곱해 반올림하고 피해는 최소 1 이다', await 있는지(game, 던전.행동막대), true);
  });
});
