import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/inventory.page.js';
import { 아이템설명창 } from './pages/item-detail.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-223',
  name: '가방 창에서 아이템 칸을 누르면 아이템 설명 창이 뜬다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui223');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('가방 창을 연다', async () => {
      const 창 = await 가방창.열기(game);
      await verify('가방 창이 보인다', await 창.떠있나(), true, { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas/PanelLayer/InventoryPanel');
      await verify('가방 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('가방 창에서 첫 칸을 누른다', async () => {
      await new 가방창(game).칸누르기(0);
      const 설명 = await 아이템설명창.뜰때까지(game);
      const 떴다 = await 설명.떠있나();
      await 설명.닫기누르기();
      await verify('가방 창에서 아이템 칸을 누르면 아이템 설명 창이 뜬다', 떴다, true);
    });
    await test.step('가방 창에서 「닫기」를 누른다', async () => {
      const 창 = new 가방창(game);
      await 창.닫기누르기();
      await game.waitFor(가방창.창, { gone: true });
      await verify('가방 창에서 「닫기」를 누르면 가방 창이 닫힌다', await 창.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
