import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 채운값 } from './helpers/game-api.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검끄고앞상태받기, 점검바꾸기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 계정번호, 서버상태 } from './helpers/ops-api.helper.js';
import type { 점검 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-628',
  name: '점검 중에 허용 계정으로 게임 로그인하면 200 으로 성공한다',
  precondition: ['점검을 지금 켜고 허용 계정에 게임 계정 번호를 넣었다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameId: z.string().describe('게임 계정 아이디').optional().meta({ secret: true, account: '게임 계정' }),
    gamePassword: z.string().describe('게임 계정 비밀번호').optional().meta({ secret: true, account: '게임 계정' }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: z.object({
    응답코드: z.number().int().describe('허용 계정의 게임 로그인 응답 코드').default(200),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  let 앞: 점검 | undefined;

  try {
    await test.step('점검을 지금 켜고 허용 계정에 게임 계정 번호를 넣는다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      const 계정 = await 계정번호(page, 채운값(params.gameId, '게임 계정 아이디'));
      await 점검바꾸기(page, { enabled: true, message: '[QA] ARO-FN-628 점검', startsAt: null, endsAt: null, allowedAccountIds: String(계정) });
    });

    await test.step('게임 서버가 점검 중으로 보는지 확인한다', async () => {
      await verify('게임 서버 상태의 점검이 활성이다', (await 서버상태(request, params.API서버)).maintenance.active, true, { blocker: true });
    });

    await test.step('게임 계정으로 게임 로그인(POST /api/login)을 부른다', async () => {
      const r = await 게임로그인(request, params.API서버, 채운값(params.gameId, '게임 계정 아이디'), 채운값(params.gamePassword, '게임 계정 비밀번호'));
      await verify('점검 중에 허용 계정으로 게임 로그인하면 200 으로 성공한다', r.status, expected.응답코드);
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
