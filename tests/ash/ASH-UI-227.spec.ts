import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-227',
  name: 'GM 콘솔에서 「초록 들판」을 누르면 구역 이름이 「초록 들판」으로 바뀐다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 GM 콘솔을 열었다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui227');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('GM 콘솔을 연다', async () => {
      const 콘솔 = await GM콘솔.열기(game);
      await verify('GM 콘솔이 보인다', await 콘솔.떠있나(), true, { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas/PanelLayer/GmConsole');
      await verify('GM 콘솔의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('GM 콘솔에서 「초록 들판」을 누른다', async () => {
      await new GM콘솔(game).순간이동누르기('TeleportBeginner');
      await new 월드화면(game).구역글뜰때까지('초록 들판', 20_000);
      await verify('GM 콘솔에서 「초록 들판」을 누르면 구역 이름이 「초록 들판」으로 바뀐다', await new 월드화면(game).구역글(), '초록 들판');
    });
    await test.step('GM 콘솔에서 「잿빛 숲」을 누른다', async () => {
      await new GM콘솔(game).순간이동누르기('TeleportIntermediate');
      await new 월드화면(game).구역글뜰때까지('잿빛 숲', 20_000);
      await verify('GM 콘솔에서 「잿빛 숲」을 누르면 구역 이름이 「잿빛 숲」으로 바뀐다', await new 월드화면(game).구역글(), '잿빛 숲');
    });
    await test.step('GM 콘솔에서 「불꽃 군주의 폐허」를 누른다', async () => {
      await new GM콘솔(game).순간이동누르기('TeleportBoss');
      await new 월드화면(game).구역글뜰때까지('불꽃 군주의 폐허', 20_000);
      await verify('GM 콘솔에서 「불꽃 군주의 폐허」를 누르면 구역 이름이 「불꽃 군주의 폐허」로 바뀐다', await new 월드화면(game).구역글(), '불꽃 군주의 폐허');
    });
    await test.step('GM 콘솔에서 「하늘빛 마을」을 누른다', async () => {
      await new GM콘솔(game).순간이동누르기('TeleportTown');
      await new 월드화면(game).구역글뜰때까지('하늘빛 마을', 20_000);
      await verify('GM 콘솔에서 「하늘빛 마을」을 누르면 구역 이름이 「하늘빛 마을」로 바뀐다', await new 월드화면(game).구역글(), '하늘빛 마을');
    });
    await test.step('GM 콘솔에서 「조회」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 「조회」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmConfigButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 골드 「지급」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 골드 「지급」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmGoldButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 아이템 「지급」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 아이템 「지급」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmItemButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 레벨 「설정」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 레벨 「설정」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmLevelButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 강화 확률 「적용」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 강화 확률 「적용」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmEnhanceRateButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 「닫기」를 누른다', async () => {
      const 콘솔 = new GM콘솔(game);
      await 콘솔.닫기누르기();
      await 콘솔.닫힐때까지();
      await verify('GM 콘솔에서 「닫기」를 누르면 콘솔이 닫힌다', await 콘솔.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
