import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 누르고결과뜰때까지, 지난시간 } from './helpers/enhance-lock.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 골드주기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-215',
  name: '강화 결과가 뜬 직후에는 「강화하기」가 잠겨 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 롱 소드와 무기 강화 주문서를 가지고 하늘빛 마을에 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 칼 = 0;
  try {
    await test.step('새 전사 캐릭터에게 롱 소드와 무기 강화 주문서 · 강화할 골드를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qaui215');
      await 골드주기(admin, 누구, 50_000);
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 3 });
      칼 = (await 가방읽기(admin, 누구)).items.find((i) => i.templateId === 'sword_long')!.id;
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 강화 창에서 롱 소드를 고른다', async () => {
      await 게임입장(game, 누구!);
      const 창 = await 강화창.열기(game);
      await 창.장비고르기(칼);
      await verify('강화 창에 「강화하기」가 보이고 누를 수 있다', (await 창.강화버튼())?.interactable, true, { blocker: true });
    });
    await test.step('강화 창에서 「강화하기」를 누르고 강화 결과가 뜨자마자 「강화하기」를 본다', async () => {
      const 창 = new 강화창(game);
      const 뜬때 = await 누르고결과뜰때까지(창);
      const 버튼 = await 창.강화버튼();
      const 읽은때 = 지난시간(뜬때);
      if (버튼?.interactable !== false) {
        await verify('강화 결과가 뜬 뒤 0.5초 안에 「강화하기」를 읽었다', 읽은때 < 500, true, { blocker: true });
      }
      await verify('강화 결과가 뜬 직후에는 「강화하기」가 잠겨 있다', 버튼?.interactable, false);
    });
    await test.step('강화 결과가 뜨고 1초를 기다린 뒤 「강화하기」를 본다', async () => {
      await new Promise((깨운다) => setTimeout(깨운다, 1_000));
      await verify('강화 결과가 뜨고 0.5초가 지나면 「강화하기」가 풀린다', (await new 강화창(game).강화버튼())?.interactable, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
