import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급정리, 지급하고번호 } from './helpers/api.helper.js';
import { 서버토큰, 우편지우기 } from './helpers/data.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';
import { 지급우편번호, 지급우편상태기다리기 } from './helpers/grant-mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-147',
  name: '운영 지급 우편을 삭제하면 지급 기록의 우편 상태가 TAKEN 또는 DELETED_BY_PLAYER 가 된다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    우편상태: z.string().describe('삭제한 뒤 우편 상태 가운데 하나').default('TAKEN'),
    다른우편상태: z.string().describe('삭제한 뒤 우편 상태 가운데 다른 하나').default('DELETED_BY_PLAYER'),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 캐릭터 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」에게 지급한 우편을 POST /api/deletemailmessage 로 삭제한다', async () => {
    let 지급번호 = 0;
    try {
      지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-147'));
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 우편번호 = await 지급우편번호(admin, 지급번호);
      await verify('지급 우편을 찾았다', 우편번호 > 0, true, { blocker: true });
      const 삭제 = await 우편지우기(request, 토큰, 우편번호);
      await verify('POST /api/deletemailmessage 응답 코드가 기대 결과와 같다', 삭제.status(), expected.응답코드, { blocker: true });
      const 상태 = await 지급우편상태기다리기(admin, 지급번호, [expected.우편상태, expected.다른우편상태]);
      await verify('운영 지급 우편을 삭제하면 지급 기록의 우편 상태가 TAKEN 또는 DELETED_BY_PLAYER 가 된다', 상태 === expected.우편상태 || 상태 === expected.다른우편상태, true);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
