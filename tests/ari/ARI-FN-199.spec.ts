import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 기본지급, 지급정리, 지급하고번호, 캐릭터번호찾기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-199',
  name: '재화를 지급한 뒤 GET /opsapi/items/known 을 부르면 「System Currency Loot Item」이 보이지 않는다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    골드: z.number().int().describe('지급할 골드 — 1 이상 정수').default(10),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터를 찾는다', async () => {
    const 계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    캐릭터 = await 캐릭터번호찾기(admin, 계정번호);
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터에 재화를 지급한 뒤 GET /opsapi/items/known 을 부른다', async () => {
    let 지급번호 = 0;
    try {
      지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-199', { items: [], currencyAmount: params.골드 }));
      await verify('시험용 재화 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await admin.get('/opsapi/items/known');
      const 몸 = (await 응답.json().catch(() => [])) as unknown;
      const 코드 = await verify('GET /opsapi/items/known 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 없음 = await verify('응답 목록에 「System Currency Loot Item」이 없다', Array.isArray(몸) && !몸.includes('System Currency Loot Item'), true);
      await verify('재화를 지급한 뒤 GET /opsapi/items/known 을 부르면 「System Currency Loot Item」이 보이지 않는다', 코드 && 없음, true);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
