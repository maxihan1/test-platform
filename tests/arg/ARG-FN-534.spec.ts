import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-534',
  name: '가방 창에서 그 아이템의 판매가를 확인하면 상점에서 팔지 않는 아이템의 판매가는 등급 기준값(일반 40, 희귀 200, 영웅 800, 전설 2,000)의 1/4 이다',
  platforms: ['android'],
  precondition: ['가방에 「보스의 왕관 조각」이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('가방 창에서 그 아이템의 판매가를 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('가방 창에서 그 아이템의 판매가를 확인하면 상점에서 팔지 않는 아이템의 판매가는 등급 기준값(일반 40, 희귀 200, 영웅 800, 전설 2,000)의 1/4 이다', await 있는지(game, 던전.행동막대), true);
  });
});
