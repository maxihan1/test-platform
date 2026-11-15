import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 본문JSON } from './helpers/api.helper.js';
import { 서버토큰, 제한상태, 제한상태부르기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-156',
  name: '계정 번호로 제한 상태를 부르면 200 과 물어본 accountId · 정지 · 채팅 금지 · 점검 차단 칸이 돌아온다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 계정번호 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 계정 번호로 POST /api/getaccountrestrictions 를 부른다', async () => {
    const 응답 = await 제한상태부르기(request, 토큰, 계정번호);
    const 몸 = await 본문JSON<Partial<제한상태>>(응답).catch(() => ({}) as Partial<제한상태>);
    const 코드 = await verify('POST /api/getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 번호 = await verify('응답 accountId 가 물어본 계정 번호와 같다', 몸.accountId, 계정번호);
    const 정지 = await verify('응답에 정지 칸 suspended 가 참 거짓으로 있다', typeof 몸.suspended, 'boolean');
    const 금지 = await verify('응답에 채팅 금지 칸 chatMuted 가 참 거짓으로 있다', typeof 몸.chatMuted, 'boolean');
    const 점검 = await verify('응답에 점검 차단 칸 maintenanceBlocked 가 참 거짓으로 있다', typeof 몸.maintenanceBlocked, 'boolean');
    await verify('계정 번호로 제한 상태를 부르면 200 과 물어본 accountId · 정지 · 채팅 금지 · 점검 차단 칸이 돌아온다', 코드 && 번호 && 정지 && 금지 && 점검, true);
  });
});
