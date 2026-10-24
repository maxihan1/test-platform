import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 개수 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';
import { 가방창 } from './pages/inventory.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-663',
  name: '강화 창에서 「강화하기」를 누른 직후 와이파이를 끊었다 다시 켜면 주문서가 한 장만 줄고 게임이 멈추지 않는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 롱 소드와 무기 강화 주문서를 가지고 하늘빛 마을에 있다'],
  techniques: ['오류 추정'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'flow:골드-강화'],
  params: null,
  expected: null,
});

async function 다음까지(읽기: () => Promise<number>, 앞: number, 한도 = 10_000): Promise<number> {
  const 끝 = Date.now() + 한도;
  let 지금 = await 읽기();
  while (지금 === 앞 && Date.now() < 끝) {
    await new Promise((깨운다) => setTimeout(깨운다, 300));
    지금 = await 읽기();
  }
  const 가라앉을때 = Date.now() + 3_000;
  while (Date.now() < 가라앉을때) {
    await new Promise((깨운다) => setTimeout(깨운다, 500));
    지금 = Math.min(지금, await 읽기());
  }
  return 지금;
}

test(spec, async ({ game, admin, driver }) => {
  let 누구: 캐릭터 | undefined;
  let 칼 = 0;
  try {
    await test.step('새 전사 캐릭터에게 롱 소드와 무기 강화 주문서를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn663');
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
    await test.step('강화 창에서 「강화하기」를 누른 직후 와이파이를 끊었다 다시 켠다', async () => {
      const 앞 = 개수(await 가방읽기(admin, 누구!), 'scroll_weapon');
      const 창 = new 강화창(game);
      await 창.강화누르기();
      try {
        await driver.execute('mobile: setConnectivity', { wifi: false });
      } finally {
        await driver.execute('mobile: setConnectivity', { wifi: true });
      }
      const 뒤 = await 다음까지(async () => 개수(await 가방읽기(admin, 누구!), 'scroll_weapon'), 앞, 20_000);
      const 한번 = await verify('주문서가 한 장만 준다', 앞 - 뒤, 1);
      await 창.닫기누르기();
      const 가방 = await 가방창.열기(game);
      const 멀쩡 = await verify('게임이 멈추지 않고 가방 창이 열린다', await 가방.떠있나(), true);
      await verify('강화 창에서 「강화하기」를 누른 직후 와이파이를 끊었다 다시 켜면 주문서가 한 장만 줄고 게임이 멈추지 않는다', 한번 && 멀쩡, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
