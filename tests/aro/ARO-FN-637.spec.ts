import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임서버토큰받기, 계정제한읽기, 채운값 } from './helpers/game-api.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 계정번호, 새제재걸기, 적용중제재풀기, 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 } from './helpers/ops-api.helper.js';
import { 시험계정, 시험사유, 적용중찾기 } from './helpers/sanction.helper.js';
import type { 게임응답 } from './helpers/game-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-637',
  name: '채팅 금지가 걸린 계정이면 응답의 chatMuted 가 참이다',
  precondition: ['점검이 꺼져 있고 qa_player2 에 채팅 금지만 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    gameServer: z.string().describe('게임 API 서버 주소').optional().meta({ secret: true, account: '게임 서버' }),
    gameServerPass: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    chatMuted: z.boolean().describe('채팅 금지 계정의 chatMuted').default(true),
    suspended: z.boolean().describe('정지 없는 계정의 suspended').default(false),
    maintenanceBlocked: z.boolean().describe('점검이 꺼져 있을 때 maintenanceBlocked').default(false),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  let 앞: 점검 | undefined;
  let 계정 = 0;
  let 응답: 게임응답 = { status: 0, body: {} };

  try {
    await test.step('점검을 끄고 qa_player2 에 채팅 금지만 건다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      계정 = await 계정번호(page, 시험계정);
      await 적용중제재풀기(page, 계정);
      await 새제재걸기(page, 계정, 'CHAT_MUTE', 시험사유('ARO-FN-637'));
    });

    await test.step('점검이 꺼져 있고 qa_player2 에 채팅 금지만 걸렸는지 확인한다', async () => {
      await verify('점검이 꺼져 있다', (await 점검읽기(page)).enabled, false, { blocker: true });
      await verify('qa_player2 에 채팅 금지가 걸려 있다', (await 적용중찾기(page, 계정, 'CHAT_MUTE')) !== null, true, { blocker: true });
      await verify('qa_player2 에 정지는 없다', (await 적용중찾기(page, 계정, 'SUSPEND')) === null, true, { blocker: true });
    });

    await test.step('게임 서버 토큰으로 /api/getaccountrestrictions 에 qa_player2 계정 번호를 보낸다', async () => {
      const 서버 = 채운값(params.gameServer, '게임 서버 주소');
      const 토큰 = await 게임서버토큰받기(request, 서버, 채운값(params.gameServerPass, '게임 서버 공유 비밀'));
      응답 = await 계정제한읽기(request, 서버, 토큰, 계정);
      await verify('응답 코드가 200 이다', 응답.status, 200, { blocker: true });
      await verify('채팅 금지가 걸린 계정이면 응답의 chatMuted 가 참이다', 응답.body.chatMuted, expected.chatMuted);
    });

    await test.step('같은 응답의 suspended 를 본다', async () => {
      await verify('응답의 suspended 는 거짓이다', 응답.body.suspended, expected.suspended);
    });

    await test.step('같은 응답의 maintenanceBlocked 를 본다', async () => {
      await verify('응답의 maintenanceBlocked 는 거짓이다', 응답.body.maintenanceBlocked, expected.maintenanceBlocked);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
