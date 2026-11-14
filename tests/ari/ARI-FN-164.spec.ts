import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 본문JSON } from './helpers/api.helper.js';
import { 서버토큰, 없는번호, 제한상태, 제한상태부르기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-164',
  name: '없는 계정 번호로 제한 상태를 부르면 200 이고 제재 없는 계정과 같은 응답이다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 일반회원번호 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「일반 회원」 계정 번호를 찾는다', async () => {
    일반회원번호 = await 계정번호찾기(admin, params.playerId ?? '');
    await verify('「일반 회원」 계정 번호를 찾았다', 일반회원번호 > 0, true, { blocker: true });
  });
  await test.step('없는 계정 번호와 「일반 회원」 계정 번호로 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 없음응답 = await 제한상태부르기(request, 토큰, 없는번호());
    const 일반응답 = await 제한상태부르기(request, 토큰, 일반회원번호);
    await verify('「일반 회원」 제한 상태 응답 코드가 200 이다', 일반응답.status(), 200, { blocker: true });
    const 없음 = await 본문JSON<제한상태>(없음응답).catch(() => ({}) as 제한상태);
    const 일반 = await 본문JSON<제한상태>(일반응답);
    const 코드 = await verify('없는 계정 번호의 제한 상태 응답 코드가 기대 결과와 같다', 없음응답.status(), expected.응답코드);
    const 정지 = await verify('정지 칸이 제재 없는 계정과 같다', `${없음.suspended}|${없음.suspendedUntil}|${없음.suspendReason}` === `${일반.suspended}|${일반.suspendedUntil}|${일반.suspendReason}`, true);
    const 금지 = await verify('채팅 금지 칸이 제재 없는 계정과 같다', `${없음.chatMuted}|${없음.chatMutedUntil}|${없음.chatMuteReason}` === `${일반.chatMuted}|${일반.chatMutedUntil}|${일반.chatMuteReason}`, true);
    const 점검 = await verify('점검 차단 칸이 제재 없는 계정과 같다', 없음.maintenanceBlocked === 일반.maintenanceBlocked, true);
    await verify('없는 계정 번호로 제한 상태를 부르면 200 이고 제재 없는 계정과 같은 응답이다', 코드 && 정지 && 금지 && 점검, true);
  });
});
