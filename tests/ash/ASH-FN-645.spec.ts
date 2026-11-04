import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 강화기록수, 강화기록이멈출때까지, 누르고결과뜰때까지, 지난시간 } from './helpers/enhance-lock.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 골드주기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-645',
  name: '강화 응답을 기다리는 동안 「강화하기」를 다시 눌러도 강화는 한 번만 된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 롱 소드와 무기 강화 주문서를 가지고 하늘빛 마을에 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 칼 = 0;
  try {
    await test.step('새 전사 캐릭터에게 롱 소드와 무기 강화 주문서 · 강화할 골드를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn645');
      await 골드주기(admin, 누구, 50_000);
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 5 });
      칼 = (await 가방읽기(admin, 누구)).items.find((i) => i.templateId === 'sword_long')!.id;
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 강화 창에서 롱 소드를 고른다', async () => {
      await 게임입장(game, 누구!);
      const 창 = await 강화창.열기(game);
      await 창.장비고르기(칼);
      await verify('강화 창 설명에 강화 비용이 보인다', (await 창.설명글()).includes('강화 비용'), true, { blocker: true });
    });
    await test.step('강화 창에서 「강화하기」를 누르고 강화 결과가 뜨기 전에 다시 누른다', async () => {
      const 창 = new 강화창(game);
      const 앞결과 = await 창.결과글();
      const 앞 = await 강화기록수(admin, 누구!);
      await 창.강화두번누르기();
      await verify('두 번째로 누를 때 강화 결과가 아직 바뀌지 않았다', await 창.결과글(), 앞결과, { blocker: true });
      const 뒤 = await 강화기록이멈출때까지(admin, 누구!, 앞);
      await verify('강화 응답을 기다리는 동안 「강화하기」를 다시 눌러도 강화는 한 번만 된다', 뒤 - 앞, 1);
    });
    await test.step('강화 창에서 「강화하기」를 누르고 강화 결과가 뜨자마자 다시 누른다', async () => {
      const 창 = new 강화창(game);
      await new Promise((깨운다) => setTimeout(깨운다, 1_500));
      const 앞 = await 강화기록수(admin, 누구!);
      const 뜬때 = await 누르고결과뜰때까지(창);
      await 창.강화누르기();
      await verify('강화 결과가 뜬 뒤 0.5초 안에 다시 눌렀다', 지난시간(뜬때) < 500, true, { blocker: true });
      const 뒤 = await 강화기록이멈출때까지(admin, 누구!, 앞);
      await verify('강화 결과가 뜬 뒤 0.5초 안에 「강화하기」를 다시 눌러도 강화는 한 번만 된다', 뒤 - 앞, 1);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
