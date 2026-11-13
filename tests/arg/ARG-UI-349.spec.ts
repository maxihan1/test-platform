import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-349',
  name: '휴대폰에서는 조작 안내 창의 마우스 그림을 숨긴다',
  platforms: ['android'],
  precondition: ['던전에 막 들어가 조작 안내 창이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 값을 읽을 게임 오브젝트 칸을 모름',
});

test(spec, async ({ game, params }) => {
  await test.step('조작 안내 창 그림을 확인한다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('휴대폰에서는 조작 안내 창의 마우스 그림을 숨긴다', await 있는지(game, 던전.행동막대), true);
  });
});
