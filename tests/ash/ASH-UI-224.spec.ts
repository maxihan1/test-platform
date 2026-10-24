import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 가방읽기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-224',
  name: '강화 창에서 장비 줄을 누르면 설명에 그 장비의 강화 비용이 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 롱 소드와 무기 강화 주문서를 가지고 하늘빛 마을에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 칼 = 0;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui224');
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 3 });
      칼 = (await 가방읽기(admin, 누구)).items.find((i) => i.templateId === 'sword_long')!.id;
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('강화 창을 연다', async () => {
      const 창 = await 강화창.열기(game);
      await verify('강화 창에 롱 소드 줄이 보인다', await 창.장비있나(칼), true, { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas/PanelLayer/EnhancePanel');
      await verify('강화 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('강화 창에서 롱 소드 줄을 누른다', async () => {
      const 창 = new 강화창(game);
      await 창.장비고르기(칼);
      await verify('강화 창에서 장비 줄을 누르면 설명에 그 장비의 강화 비용이 보인다', (await 창.설명글()).includes('강화 비용'), true);
    });
    await test.step('강화 창에서 「강화하기」를 누른다', async () => {
      const 결과 = await new 강화창(game).강화하기();
      await verify('강화 창에서 「강화하기」를 누르면 강화 결과 글이 보인다', 결과.startsWith('강화'), true);
    });
    await test.step('강화 창에서 「닫기」를 누른다', async () => {
      const 창 = new 강화창(game);
      await 창.닫기누르기();
      await game.waitFor(강화창.창, { gone: true });
      await verify('강화 창에서 「닫기」를 누르면 창이 닫힌다', await 창.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
