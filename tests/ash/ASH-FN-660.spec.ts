import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 개수 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/inventory.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-660',
  name: '상점 창에서 「1개」를 누른 직후 와이파이를 끊었다 다시 켜면 빨간 물약이 한 번만 사지고 게임이 멈추지 않는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  techniques: ['오류 추정'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
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
    지금 = Math.max(지금, await 읽기());
  }
  return 지금;
}

test(spec, async ({ game, admin, driver }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn660');
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 상점 창을 연다', async () => {
      await 게임입장(game, 누구!);
      const 창 = await 상점창.열기(game);
      await verify('상점 창에 빨간 물약 줄이 보인다', await 창.구매줄있나('potion_hp_s'), true, { blocker: true });
    });
    await test.step('상점 창에서 「1개」를 누른 직후 와이파이를 끊었다 다시 켠다', async () => {
      const 앞 = 개수(await 가방읽기(admin, 누구!), 'potion_hp_s');
      const 창 = new 상점창(game);
      await 창.하나사기('potion_hp_s');
      try {
        await driver.execute('mobile: setConnectivity', { wifi: false });
      } finally {
        await driver.execute('mobile: setConnectivity', { wifi: true });
      }
      const 뒤 = await 다음까지(async () => 개수(await 가방읽기(admin, 누구!), 'potion_hp_s'), 앞, 20_000);
      const 한번 = await verify('빨간 물약이 한 번만 사진다', 뒤 - 앞, 1);
      await 창.닫기누르기();
      const 가방 = await 가방창.열기(game);
      const 멀쩡 = await verify('게임이 멈추지 않고 가방 창이 열린다', await 가방.떠있나(), true);
      await verify('상점 창에서 「1개」를 누른 직후 와이파이를 끊었다 다시 켜면 빨간 물약이 한 번만 사지고 게임이 멈추지 않는다', 한번 && 멀쩡, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
