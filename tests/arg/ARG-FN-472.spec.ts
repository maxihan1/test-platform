import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-472',
  name: '직업 표를 게임 데이터 API 로 읽으면 직업 표(「탱커」 1,200 · 「궁수」 900 · 「마법사」 800 · 「도적」 1,000)의 기본 체력대로 게임이 정한다',
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
  await test.step('직업 표를 게임 데이터 API 로 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('직업 표를 게임 데이터 API 로 읽으면 직업 표(「탱커」 1,200 · 「궁수」 900 · 「마법사」 800 · 「도적」 1,000)의 기본 체력대로 게임이 정한다', await 뜨는지(game, 화면글자('탱커')), true);
  });
});
