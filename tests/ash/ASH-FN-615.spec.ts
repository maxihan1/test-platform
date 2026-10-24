import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 산봇들, 새캐릭터, 순간이동, type 캐릭터 } from './helpers/game-state.helper.js';
import { 거리, 거리가바뀔때까지, 월드에들어가기, 자리읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-615',
  name: '선공형 봇은 선량한 플레이어가 12m 안에 오면 먼저 공격한다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 선공형 봇에게서 12m 넘게 떨어져 있다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Beginner', 'state:성향=선량'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    플레이어: z.string().describe('내 캐릭터 오브젝트 주소 — 게임 화면에서 읽는다'),
    선공형봇: z.string().describe('가까이 있는 선공형 봇 오브젝트 주소 — 게임 화면에서 읽는다'),
    감지거리: z.number().min(1).describe('선공형 봇이 먼저 공격하는 거리(m) — 1 이상').default(12),
  }),
  expected: z.object({
    지켜볼초: z.number().int().min(1).describe('먼저 공격하는지 지켜볼 시간(초) — 1 이상').default(10),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어가 선공형 봇에게서 12m 넘게 떨어진 자리에 선다', async () => {
      나 = await 새캐릭터(admin, 'zqa615');
      await 순간이동(admin, 나, 'Beginner');
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('월드와 선공형 봇이 보이는지, 봇이 12m 넘게 떨어져 있는지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify('선공형 봇이 보인다', (await game.find(params.선공형봇)) !== null, true, { blocker: true });
      const 선공형 = (await 산봇들(admin, 나!, 'Beginner')).filter((b) => b.temperament === 'Aggressive');
      await verify('초록 들판에 살아 있는 선공형 봇이 있다', 선공형.length > 0, true, { blocker: true });
      await verify('선공형 봇에게서 12m 넘게 떨어져 있다', (await 거리(game, params.플레이어, params.선공형봇)) > params.감지거리, true, { blocker: true });
    });

    await test.step('선공형 봇에게 12m 안으로 다가간다', async () => {
      const 봇자리 = await 자리읽기(game, params.선공형봇);
      await 순간이동(admin, 나!, { x: 봇자리.x + Math.max(1, params.감지거리 - 5), z: 봇자리.z });
      const 기준 = await 거리(game, params.플레이어, params.선공형봇);
      const 다가옴 = await 거리가바뀔때까지(game, params.플레이어, params.선공형봇, 기준, '가까워짐', expected.지켜볼초 * 1000);
      await verify('선공형 봇은 선량한 플레이어가 12m 안에 오면 먼저 공격한다', 다가옴, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
