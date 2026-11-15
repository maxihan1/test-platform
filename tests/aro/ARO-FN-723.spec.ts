import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임토큰받기, 운영자API부르기, 채운값 } from './helpers/game-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-723',
  name: '게임 토큰으로 운영자 API 를 부르면 401 이다',
  techniques: ['동등 분할'],
  precondition: ['게임 계정으로 게임 로그인해 게임 토큰을 받았다'],
  params: z.object({
    gameId: z.string().describe('게임 계정 아이디').optional().meta({ secret: true, account: '게임 계정' }),
    gamePassword: z.string().describe('게임 계정 비밀번호').optional().meta({ secret: true, account: '게임 계정' }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영자 API(/opsapi)도 이 서버에 있다').default('https://bossroom-api.maxihan.com'),
  }),
  expected: z.object({
    응답코드: z.number().int().describe('게임 토큰으로 부른 운영자 API 응답 코드').default(401),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';

  await test.step('게임 계정으로 게임 로그인해 게임 토큰을 받는다', async () => {
    토큰 = await 게임토큰받기(request, params.API서버, 채운값(params.gameId, '게임 계정 아이디'), 채운값(params.gamePassword, '게임 계정 비밀번호'));
    await verify('게임 토큰을 받았다', 토큰 !== '', true, { blocker: true });
  });

  await test.step('게임 토큰으로 운영자 API(/opsapi/me)를 부른다', async () => {
    const r = await 운영자API부르기(request, params.API서버, 토큰);
    await verify('게임 토큰으로 운영자 API 를 부르면 401 이다', r.status, expected.응답코드);
  });
});
