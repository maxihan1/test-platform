import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하고번호, 지급정리 } from './helpers/api.helper.js';
import { 두번째캐릭터번호, 지급기록찾기 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-207',
  name: '재화를 넣어 지급하면 아이템 흐름 기록의 재화 이름이 「Gold」다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    재화량: z.number().int().describe('지급할 골드 — 1~1000000').default(10),
  }),
  expected: z.object({
    재화이름: z.string().describe('아이템 흐름 기록의 재화 이름').default('Gold'),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('골드 10 을 지급한 뒤 GET /opsapi/logs/items 에서 그 지급 기록을 찾는다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-207', { items: [], currencyAmount: params.재화량 }));
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 기록 = await 지급기록찾기(admin, 캐릭터, 지급번호);
      await verify('GET /opsapi/logs/items 에서 그 지급 기록을 찾았다', 기록 !== null, true, { blocker: true });
      await verify('재화를 넣어 지급하면 아이템 흐름 기록의 재화 이름이 「Gold」다', 기록?.itemName ?? '', expected.재화이름);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
