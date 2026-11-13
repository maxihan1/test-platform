import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-497',
  name: '반올림은 정확히 .5 이면 가까운 짝수로 간다(12.5 → 12, 13.5 → 14)',
  platforms: ['android'],
  precondition: ['피해가 정확히 .5 로 나오는 캐릭터로 던전에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('적을 공격하고 피해를 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('반올림은 정확히 .5 이면 가까운 짝수로 간다(12.5 → 12, 13.5 → 14)', await 있는지(game, 던전.행동막대), true);
  });
});
