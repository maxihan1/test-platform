import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 채운값 } from './helpers/game-api.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 시험사유 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-277',
  name: '정지를 해제하면 바로 다음 게임 로그인이 200 으로 성공한다',
  precondition: ['게임 계정에 정지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameId: z.string().describe('게임 계정 아이디').optional().meta({ secret: true, account: '게임 계정' }),
    gamePassword: z.string().describe('게임 계정 비밀번호').optional().meta({ secret: true, account: '게임 계정' }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: z.object({
    응답코드: z.number().int().describe('해제 뒤 게임 로그인 응답 코드').default(200),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  let 계정 = 0;
  let 제재번호 = 0;

  try {
    await test.step('운영자 계정으로 게임 계정에 정지를 건다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 채운값(params.gameId, '게임 계정 아이디'));
      제재번호 = await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-277'));
    });

    await test.step('게임 계정에 정지가 걸려 게임 로그인이 막히는지 확인한다', async () => {
      const r = await 게임로그인(request, params.API서버, 채운값(params.gameId, '게임 계정 아이디'), 채운값(params.gamePassword, '게임 계정 비밀번호'));
      await verify('게임 계정에 정지가 걸려 있다', r.status, 403, { blocker: true });
    });

    await test.step('API 로 그 정지를 해제한 뒤 바로 게임 로그인(POST /api/login)을 부른다', async () => {
      const 해제 = await 제재해제(page, 제재번호, '[QA] ARO-FN-277 해제');
      await verify('정지 해제 API 가 성공한다', 해제.status, 200, { blocker: true });
      const r = await 게임로그인(request, params.API서버, 채운값(params.gameId, '게임 계정 아이디'), 채운값(params.gamePassword, '게임 계정 비밀번호'));
      await verify('정지를 해제하면 바로 다음 게임 로그인이 200 으로 성공한다', r.status, expected.응답코드);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
