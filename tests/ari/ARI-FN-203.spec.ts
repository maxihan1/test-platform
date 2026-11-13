import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 본문JSON, 지급하기, 지급정리 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-203',
  name: '「두 번째 플레이어」 캐릭터에 체력 물약 1개를 지급하면 지급 건 번호 id 가 돌아온다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    아이템수량: z.number().int().describe('지급할 체력 물약 개수 — 1~99').default(1),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터에 체력 물약 1개를 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-203', { items: [{ itemName: '체력 물약', quantity: params.아이템수량 }] }));
    let 지급번호 = 0;
    try {
      const 코드 = await verify('지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 몸 = await 본문JSON<{ id?: unknown }>(응답).catch(() => ({}) as { id?: unknown });
      지급번호 = typeof 몸.id === 'number' ? 몸.id : 0;
      const 번호 = await verify('응답 id 가 1 이상의 정수다', Number.isInteger(지급번호) && 지급번호 >= 1, true);
      await verify('「두 번째 플레이어」 캐릭터에 체력 물약 1개를 지급하면 지급 건 번호 id 가 돌아온다', 코드 && 번호, true);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
