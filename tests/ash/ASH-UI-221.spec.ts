import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 찾기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 골드주기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 안내띠 } from './components/toast.component.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-221',
  name: '상점 창에서 「1개」를 누르면 보유 골드가 준다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  params: null,
  expected: null,
});

async function 골드바뀔때까지(창: 상점창, 앞: string): Promise<void> {
  const 끝 = Date.now() + 10_000;
  while ((await 창.보유골드글()) === 앞 && Date.now() < 끝) await new Promise((깨운다) => setTimeout(깨운다, 300));
}

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui221');
      await 골드주기(admin, 누구, 10_000);
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('상점 창을 연다', async () => {
      const 창 = await 상점창.열기(game);
      await verify('상점 창이 보인다', await 창.떠있나(), true, { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas/PanelLayer/ShopPanel');
      await verify('상점 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('상점 창에서 빨간 물약 「1개」를 누른다', async () => {
      const 창 = new 상점창(game);
      const 앞 = await 창.보유골드글();
      await 창.하나사기('potion_hp_s');
      await 골드바뀔때까지(창, 앞);
      await verify('상점 창에서 「1개」를 누르면 보유 골드가 준다', (await 창.보유골드글()) !== 앞, true);
    });
    await test.step('상점 창에서 빨간 물약 「10개」를 누른다', async () => {
      const 창 = new 상점창(game);
      const 앞 = await 창.보유골드글();
      await 창.열개사기('potion_hp_s');
      await 골드바뀔때까지(창, 앞);
      await verify('상점 창에서 「10개」를 누르면 보유 골드가 더 준다', (await 창.보유골드글()) !== 앞, true);
    });
    await test.step('상점 창에서 짧은 검 「구매」를 누른다', async () => {
      const 창 = new 상점창(game);
      const 앞 = await 창.보유골드글();
      await 창.하나사기('sword_short');
      await 골드바뀔때까지(창, 앞);
      await verify('상점 창에서 무기 「구매」를 누르면 보유 골드가 또 준다', (await 창.보유골드글()) !== 앞, true);
    });
    await test.step('상점 창에서 「판매」를 누른다', async () => {
      const 창 = new 상점창(game);
      await 창.판매탭누르기();
      const 물약 = 찾기(await 가방읽기(admin, 누구!), 'potion_hp_s')!;
      await game.waitFor(창.판매줄(물약.id));
      await verify('상점 창에서 「판매」를 누르면 판매 목록이 보인다', await 창.판매줄있나(물약.id), true);
    });
    await test.step('상점 창에서 빨간 물약 「1개 판매」를 누른다', async () => {
      const 창 = new 상점창(game);
      const 물약 = 찾기(await 가방읽기(admin, 누구!), 'potion_hp_s')!;
      await 창.하나팔기(물약.id);
      await new 안내띠(game).뜰때까지('판매했습니다');
      await verify('상점 창에서 「1개 판매」를 누르면 판매 안내 띠가 뜬다', (await new 안내띠(game).읽기())?.includes('판매했습니다') ?? false, true);
    });
    await test.step('상점 창에서 빨간 물약 「모두 판매」를 누른다', async () => {
      const 창 = new 상점창(game);
      const 물약 = 찾기(await 가방읽기(admin, 누구!), 'potion_hp_s')!;
      await 창.모두팔기(물약.id);
      await game.waitFor(창.판매줄(물약.id), { gone: true });
      await verify('상점 창에서 「모두 판매」를 누르면 그 판매 줄이 사라진다', await 창.판매줄있나(물약.id), false);
    });
    await test.step('상점 창에서 「구매」 탭을 누른다', async () => {
      const 창 = new 상점창(game);
      await 창.구매탭누르기();
      await game.waitFor(창.구매줄('potion_hp_s'));
      await verify('상점 창에서 「구매」 탭을 누르면 구매 줄이 다시 보인다', await 창.구매줄있나('potion_hp_s'), true);
    });
    await test.step('상점 창에서 「닫기」를 누른다', async () => {
      const 창 = new 상점창(game);
      await 창.닫기누르기();
      await game.waitFor(상점창.창, { gone: true });
      await verify('상점 창에서 「닫기」를 누르면 창이 닫힌다', await 창.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
