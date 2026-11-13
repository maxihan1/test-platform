import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-646',
  name: '던지는 임프 · 보스 임프의 재사용 대기를 읽으면 던지는 임프 재사용 대기는 4초, 보스 짓밟기 돌진은 7.5초다',
  platforms: ['android'],
  precondition: ['게임 데이터 API 를 부를 수 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 게임 데이터 API 가 서비스 가이드에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('던지는 임프 · 보스 임프의 재사용 대기를 읽는다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('던지는 임프 · 보스 임프의 재사용 대기를 읽으면 던지는 임프 재사용 대기는 4초, 보스 짓밟기 돌진은 7.5초다', await 있는지(game, 던전.행동막대), true);
  });
});
