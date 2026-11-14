import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 채운값 } from './helpers/game-api.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 시험사유, 적용중찾기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-636',
  name: '정지된 계정이 맞는 비밀번호로 게임 로그인하면 403 이다',
  techniques: ['동등 분할'],
  precondition: ['게임 계정에 정지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameId: z.string().describe('게임 계정 아이디').optional().meta({ secret: true, account: '게임 계정' }),
    gamePassword: z.string().describe('게임 계정 비밀번호').optional().meta({ secret: true, account: '게임 계정' }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: z.object({
    응답코드: z.number().int().describe('정지로 막힌 게임 로그인 응답 코드').default(403),
    code: z.string().describe('정지로 막힌 게임 로그인 응답의 code').default('SUSPENDED'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  let 계정 = 0;
  let 응답 = { status: 0, body: {} as Record<string, unknown> };

  try {
    await test.step('운영자 계정으로 게임 계정에 정지를 건다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 채운값(params.gameId, '게임 계정 아이디'));
      await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-636'));
    });

    await test.step('게임 계정에 정지가 걸렸는지 확인한다', async () => {
      await verify('게임 계정에 정지가 걸려 있다', (await 적용중찾기(page, 계정, 'SUSPEND')) !== null, true, { blocker: true });
    });

    await test.step('맞는 비밀번호로 게임 로그인(POST /api/login)을 부른다', async () => {
      응답 = await 게임로그인(request, params.API서버, 채운값(params.gameId, '게임 계정 아이디'), 채운값(params.gamePassword, '게임 계정 비밀번호'));
      await verify('정지된 계정이 맞는 비밀번호로 게임 로그인하면 403 이다', 응답.status, expected.응답코드);
    });

    await test.step('그 응답 본문의 code 를 본다', async () => {
      await verify('정지로 막힌 게임 로그인 응답의 code 는 SUSPENDED 다', 응답.body.code, expected.code);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
