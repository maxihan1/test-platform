import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-002',
  name: '하늘빛 마을 월드 화면에 상인 · 강화사 · 경비병 NPC 가 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'npc:상인', 'npc:강화사', 'npc:경비병'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui002');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('하늘빛 마을 월드 화면을 연다', async () => {
      const 월드 = new 월드화면(game);
      const 상인 = await verify('상인 NPC 가 보인다', await 월드.NPC있나('merchant'), true);
      const 강화사 = await verify('강화사 NPC 가 보인다', await 월드.NPC있나('enhancer'), true);
      const 경비병 = await verify('경비병 NPC 가 보인다', (await 월드.NPC있나('guard_w')) || (await 월드.NPC있나('guard_e')), true);
      const 배치 = await game.layout('/WorldRoot/HudCanvas');
      await verify('월드 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify('하늘빛 마을 월드 화면에 상인 · 강화사 · 경비병 NPC 가 보인다', 상인 && 강화사 && 경비병, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
