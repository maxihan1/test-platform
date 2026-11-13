import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하기 } from './helpers/api.helper.js';
import { 두번째캐릭터번호, 성공이면지급정리 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-205',
  name: '게임 데이터에 없는 아이템 이름으로 지급하면 200 이다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드_없는아이템: z.number().describe('없는 아이템 이름 지급의 응답 코드').default(200),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('게임 데이터에 없는 아이템 이름 「[QA] 없는 아이템」으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-205', { items: [{ itemName: '[QA] 없는 아이템', quantity: 1 }] }));
    try {
      await verify('게임 데이터에 없는 아이템 이름으로 지급하면 200 이다', 응답.status(), expected.응답코드_없는아이템);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
});
