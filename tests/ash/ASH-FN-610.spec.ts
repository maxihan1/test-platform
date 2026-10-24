import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  계정지우기,
  고정비우기,
  드랍확률되돌리기,
  산봇들,
  새캐릭터,
  순간이동,
  어드민설정,
  캐릭터읽기,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 악명봇처치되풀이, 악명봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-610',
  name: '악명 봇을 정해 둔 횟수만큼 처치하면 전리품을 얻는 비율이 80% 와 허용 오차 안에서 같다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 악명 봇이 넉넉히 있다'],
  held: '보류 — 악명 봇을 정해 둔 횟수만큼 만들 길이 없음(부활 60초)',
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: z.object({
    횟수: z.number().int().min(1).describe('처치 횟수 — 많을수록 비율이 확률에 가깝다 · 악명 봇을 그만큼 만들 수 있어야 한다').default(100),
  }),
  expected: z.object({
    허용오차: z.number().min(0.001).max(0.999).describe('결과마다 비율 허용 오차 — 0 과 1 사이').default(0.12),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 악명 봇을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa610');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 악명봇하나(admin, 'zqa610', 나);
    });

    await test.step('캐릭터와 악명 봇이 초록 들판에 있고 악명 봇 전리품 확률이 기본 설정인지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 악명 봇이 있다', (await 산봇들(admin, 나!, 'Beginner', 'Chaotic')).length > 0, true, { blocker: true });
      await verify('설정의 악명 봇 전리품 확률이 80% 다', (await 어드민설정(admin)).drop.botLootChanceChaotic, 0.8, { blocker: true });
    });

    await test.step('악명 봇을 정해 둔 횟수만큼 처치한다', async () => {
      const 셈 = await 악명봇처치되풀이(admin, 'zqa610', 나!, params.횟수);
      const 맞음 = await verify.rates(
        '전리품을 얻은 횟수와 못 얻은 횟수의 비율이 결과마다 기대 확률 ± 허용 오차 안이다',
        셈,
        { 얻음: 0.8, 못얻음: 0.2 },
        expected.허용오차,
      );
      await verify('악명 봇을 정해 둔 횟수만큼 처치하면 전리품을 얻는 비율이 80% 와 허용 오차 안에서 같다', 맞음, true);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
