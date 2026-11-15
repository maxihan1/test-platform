import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 본문JSON, 시각, 점검되돌리기, 점검설정, 점검설정바꾸기, 점검설정읽기 } from './helpers/api.helper.js';
import { 서버토큰, 제한상태, 제한상태부르기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-159',
  name: '점검 중 허용 목록에 없는 계정의 제한 상태를 부르면 maintenanceBlocked 가 참이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
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
  let 원래점검: 점검설정 | null = null;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  await test.step('점검을 켠 채 허용 목록에 없는 「두 번째 플레이어」 계정 번호로 POST /api/getaccountrestrictions 를 부른다', async () => {
    try {
      원래점검 = await 점검설정읽기(admin);
      const 켜기 = await 점검설정바꾸기(admin, { enabled: true, message: '[QA] ARI-FN-159 점검 시험', startsAt: null, endsAt: 시각(10), allowedAccountIds: [] });
      await verify('점검이 켜졌다', 켜기.status(), 200, { blocker: true });
      const 응답 = await 제한상태부르기(request, 토큰, 계정번호);
      await verify('POST /api/getaccountrestrictions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드, { blocker: true });
      const 몸 = await 본문JSON<제한상태>(응답);
      await verify('점검 중 허용 목록에 없는 계정의 제한 상태를 부르면 maintenanceBlocked 가 참이다', 몸.maintenanceBlocked, true);
    } finally {
      if (원래점검 !== null) await 점검되돌리기(admin, 원래점검);
    }
  });
});
