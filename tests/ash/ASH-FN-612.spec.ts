import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결과고정, 계정지우기, 고정비우기, 드랍확률되돌리기, 봇처치, 새캐릭터, 순간이동, type 캐릭터 } from './helpers/game-state.helper.js';
import { 봇부활기다리기, 봇찾기, 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-612',
  name: '소지품이 최소 수량 아래로 줄었던 봇이 부활하면 최소 수량까지 찬다',
  platforms: ['android'],
  precondition: ['소지품이 줄어든 봇이 있다'],
  held: '보류 — 봇 최소 수량 값이 자료에 없음',
  elements: ['zone:Beginner', 'state:성향=선량', 'state:생존=죽음'],
  params: z.object({
    최소수량: z.number().int().min(0).describe('봇 소지품 최소 수량 — 자료에 값이 없어 사람이 채운다'),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('새 캐릭터로 선량한 봇의 전리품을 가져가 소지품을 줄인다', async () => {
      나 = await 새캐릭터(admin, 'zqa612');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      const 봇 = await 산봇하나(admin, 나, 'Beginner', 'Innocent');
      봇번호 = 봇.id;
      await 결과고정(admin, { botLoot: [true] });
      await 봇처치(admin, 나, 봇.id);
    });

    await test.step('봇의 소지품이 최소 수량 아래로 줄었는지 확인한다', async () => {
      const 줄어든 = (await 봇찾기(admin, 나!, 봇번호))?.itemCount;
      await verify('소지품이 줄어든 봇이 있다', 줄어든 !== undefined && 줄어든 < params.최소수량, true, { blocker: true });
    });

    await test.step('봇이 부활한 뒤 소지품 수를 읽는다', async () => {
      const 걸린초 = await 봇부활기다리기(admin, 나!, 봇번호, 90_000);
      const 부활 = await verify('봇이 부활한다', 걸린초 !== null, true);
      const 수 = await verify('부활한 봇의 소지품이 최소 수량이다', (await 봇찾기(admin, 나!, 봇번호))?.itemCount, params.최소수량);
      await verify('소지품이 최소 수량 아래로 줄었던 봇이 부활하면 최소 수량까지 찬다', 부활 && 수, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
