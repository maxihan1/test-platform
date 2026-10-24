import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-UI-201',
  name: '하늘빛 마을 화면에 상인 · 강화사 · 경비병이 보인다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 마을에 있다'],
  held: '보류 — 게임 창을 못 엶(월드 마을)',
  elements: ['zone:Town', 'npc:상인', 'npc:강화사', 'npc:경비병'],
  params: z.object({
    마을화면: z.string().describe('하늘빛 마을 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    상인: z.string().describe('상인 오브젝트 주소 — 게임 화면에서 읽는다'),
    강화사: z.string().describe('강화사 오브젝트 주소 — 게임 화면에서 읽는다'),
    경비병: z.string().describe('경비병 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqu201');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('마을 화면을 확인한다', async () => {
      await game.waitFor(params.마을화면);
      const 배치 = await game.layout(params.마을화면);
      await verify('하늘빛 마을 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      const 상인 = await verify('마을 화면에 상인이 보인다', (await game.find(params.상인)) !== null, true);
      const 강화사 = await verify('마을 화면에 강화사가 보인다', (await game.find(params.강화사)) !== null, true);
      const 경비병 = await verify('마을 화면에 경비병이 보인다', (await game.find(params.경비병)) !== null, true);
      await verify('하늘빛 마을 화면에 상인 · 강화사 · 경비병이 보인다', 상인 && 강화사 && 경비병, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
