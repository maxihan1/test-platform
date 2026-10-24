import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { GM콘솔 } from './pages/gm-console.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-228',
  name: 'GM 콘솔에 강화 확률 「초기화」 버튼이 보이고 누를 수 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 GM 콘솔을 열었다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui228');
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
    await test.step('GM 콘솔에서 강화 확률 「초기화」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 강화 확률 「초기화」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmEnhanceRateResetButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 봇 리셋 「전체」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 봇 리셋 「전체」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmBotResetAllButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 봇 리셋 「현재 구역」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 봇 리셋 「현재 구역」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmBotResetZoneButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 성향치 「설정」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 성향치 「설정」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmAlignmentButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 드랍 확률 「적용」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 드랍 확률 「적용」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmDropButton'))?.interactable, true);
    });
    await test.step('GM 콘솔에서 드랍 확률 「초기화」 버튼을 확인한다', async () => {
      await verify('GM 콘솔에 드랍 확률 「초기화」 버튼이 보이고 누를 수 있다', (await new GM콘솔(game).버튼('GmDropResetButton'))?.interactable, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
