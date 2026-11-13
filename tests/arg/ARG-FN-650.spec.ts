import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-650',
  name: '스킬 표 마법사 · 도적 · 공통 줄을 게임 데이터 API 로 읽으면 게임 데이터 API 의 마법사 · 도적 · 공통 스킬 값이 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['게임 데이터 API 를 부를 수 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 게임 데이터 API 가 서비스 가이드에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('스킬 표 마법사 · 도적 · 공통 줄을 게임 데이터 API 로 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('스킬 표 마법사 · 도적 · 공통 줄을 게임 데이터 API 로 읽으면 게임 데이터 API 의 마법사 · 도적 · 공통 스킬 값이 스킬 표와 같다', await 있는지(game, 던전.행동막대), true);
  });
});
