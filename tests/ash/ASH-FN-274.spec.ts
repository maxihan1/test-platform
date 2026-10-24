import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  봇처치되풀이,
  산봇들,
  새캐릭터,
  순간이동,
  어드민설정,
  월드다시두기,
  캐릭터읽기,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-274',
  name: '선량한 봇을 정해 둔 횟수만큼 처치하면 전리품을 얻는 비율이 50% 와 허용 오차 안에서 같다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 봇이 다시 시드돼 있다'],
  elements: ['zone:Beginner', 'drop:bot_loot', 'state:성향=선량'],
  params: z.object({
    횟수: z.number().int().min(1).describe('처치 횟수 — 많을수록 비율이 확률에 가깝다').default(1000),
  }),
  expected: z.object({
    허용오차: z.number().min(0.001).max(0.999).describe('결과마다 비율 허용 오차 — 0 과 1 사이').default(0.05),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 봇을 다시 시드한다', async () => {
      나 = await 새캐릭터(admin, 'zqa274');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 월드다시두기(admin, 'Beginner');
    });

    await test.step('캐릭터와 봇이 초록 들판에 있고 봇 전리품 확률이 기본 설정인지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', (await 산봇들(admin, 나!, 'Beginner', 'Innocent')).length > 0, true, { blocker: true });
      await verify('설정의 봇 전리품 확률이 50% 다', (await 어드민설정(admin)).drop.botLootChance, 0.5, { blocker: true });
    });

    await test.step('선량한 봇을 정해 둔 횟수만큼 처치한다', async () => {
      const 셈 = await 봇처치되풀이(admin, 나!, params.횟수);
      const 맞음 = await verify.rates(
        '전리품을 얻은 횟수와 못 얻은 횟수의 비율이 결과마다 기대 확률 ± 허용 오차 안이다',
        셈,
        { 얻음: 0.5, 못얻음: 0.5 },
        expected.허용오차,
      );
      await verify('선량한 봇을 정해 둔 횟수만큼 처치하면 전리품을 얻는 비율이 50% 와 허용 오차 안에서 같다', 맞음, true);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
