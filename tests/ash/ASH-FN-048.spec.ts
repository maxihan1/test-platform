import { defineCase, test, verify } from '@platform/kit';

import { 찾기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 해제결과 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-048',
  name: '전사가 짧은 검을 해제하면 공격력이 직업 기본값 12 다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 장착하고 있다'],
  techniques: ['상태 전이'],
  elements: ['class:Warrior', 'item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn048');
    });
    await test.step('새 전사 캐릭터가 짧은 검을 장착하고 있는지 확인한다', async () => {
      const 속 = await 가방읽기(admin, 누구!);
      await verify('새 전사 캐릭터가 짧은 검을 장착하고 있다', 찾기(속, 'sword_short')?.equippedSlot, 'Weapon', { blocker: true });
    });
    await test.step('짧은 검을 해제하고 능력치를 받는다', async () => {
      const 나 = 누구!;
      const 칼 = 찾기(await 가방읽기(admin, 나), 'sword_short');
      await 해제결과(request, 나, 칼!.id);
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('전사가 짧은 검을 해제하면 공격력이 직업 기본값 12 다', 정보.stats.attack, 12);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
