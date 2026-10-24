import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  드랍확률바꾸기,
  봇처치되풀이,
  새캐릭터,
  순간이동,
  캐릭터읽기,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-275',
  name: '봇 전리품 확률을 100% 로 바꾸고 선량한 봇을 처치하면 매번 전리품을 얻는다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'drop:bot_loot', 'state:성향=선량'],
  params: z.object({
    횟수: z.number().int().min(1).describe('확률마다 처치할 횟수 — 1 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 봇 전리품 확률을 기본 설정으로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa275');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
    });

    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('봇 전리품 확률을 100% 로 바꾸고 선량한 봇을 정해 둔 횟수만큼 처치한다', async () => {
      await 드랍확률바꾸기(admin, { botLootChance: 1 });
      const 셈 = await 봇처치되풀이(admin, 나!, params.횟수);
      await verify('봇 전리품 확률을 100% 로 바꾸고 선량한 봇을 처치하면 매번 전리품을 얻는다', 셈.얻음, params.횟수);
    });

    await test.step('봇 전리품 확률을 0% 로 바꾸고 선량한 봇을 정해 둔 횟수만큼 처치한다', async () => {
      await 드랍확률바꾸기(admin, { botLootChance: 0 });
      const 셈 = await 봇처치되풀이(admin, 나!, params.횟수);
      await verify('봇 전리품 확률을 0% 로 바꾸고 선량한 봇을 처치하면 한 번도 전리품을 얻지 않는다', 셈.얻음, 0);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
