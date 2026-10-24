import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/inventory.page.js';
import { 아이템설명창 } from './pages/item-detail.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-222',
  name: '아이템 설명 창에서 「해제」를 누르면 그 칸의 「E」 표시가 사라진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 장착한 짧은 검의 설명 창을 열었다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui222');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('가방에서 장착한 짧은 검의 설명 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      await 가방.칸누르기(0);
      const 설명 = await 아이템설명창.뜰때까지(game);
      await verify('설명 창에 「짧은 검」이 보인다', await 설명.이름(), '짧은 검', { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas/PanelLayer/ItemDetailPopup');
      await verify('아이템 설명 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('아이템 설명 창에서 「해제」를 누른다', async () => {
      await new 아이템설명창(game).해제누르기();
      await game.waitFor(`${new 가방창(game).칸(0)}/Equipped`, { gone: true });
      await verify('아이템 설명 창에서 「해제」를 누르면 그 칸의 「E」 표시가 사라진다', await new 가방창(game).장착표시있나(0), false);
    });
    await test.step('아이템 설명 창에서 「장착」을 누른다', async () => {
      await new 가방창(game).칸누르기(0);
      const 설명 = await 아이템설명창.뜰때까지(game);
      await 설명.장착누르기();
      await game.waitFor(`${new 가방창(game).칸(0)}/Equipped`);
      await verify('아이템 설명 창에서 「장착」을 누르면 그 칸에 「E」 표시가 다시 보인다', await new 가방창(game).장착표시있나(0), true);
    });
    await test.step('아이템 설명 창에서 「닫기」를 누른다', async () => {
      await new 가방창(game).칸누르기(0);
      const 설명 = await 아이템설명창.뜰때까지(game);
      await 설명.닫기누르기();
      await game.waitFor(아이템설명창.창, { gone: true });
      await verify('아이템 설명 창에서 「닫기」를 누르면 창이 닫힌다', await 설명.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
