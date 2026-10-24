import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터선택화면 } from './pages/character-select.page.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 가방창 } from './pages/inventory.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-218',
  name: '월드 화면에서 「가방」을 누르면 가방 창이 뜬다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 초록 들판에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui218');
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas');
      await verify('월드 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('월드 화면에서 「가방」을 누른다', async () => {
      const 월드 = new 월드화면(game);
      await 월드.가방누르기();
      await game.waitFor(가방창.창);
      const 떴다 = await new 가방창(game).떠있나();
      await new 가방창(game).닫기누르기();
      await verify('월드 화면에서 「가방」을 누르면 가방 창이 뜬다', 떴다, true);
    });
    await test.step('월드 화면에서 「정보」를 누른다', async () => {
      await new 월드화면(game).정보누르기();
      await game.waitFor(캐릭터정보창.창);
      const 떴다 = await new 캐릭터정보창(game).떠있나();
      await new 캐릭터정보창(game).닫기누르기();
      await verify('월드 화면에서 「정보」를 누르면 캐릭터 정보 창이 뜬다', 떴다, true);
    });
    await test.step('월드 화면에서 「GM」을 누른다', async () => {
      await new 월드화면(game).GM누르기();
      await game.waitFor(GM콘솔.창);
      const 떴다 = await new GM콘솔(game).떠있나();
      await new GM콘솔(game).닫기누르기();
      await verify('월드 화면에서 「GM」을 누르면 GM 콘솔이 뜬다', 떴다, true);
    });
    await test.step('월드 화면에서 「대지 가르기」를 누른다', async () => {
      const 월드 = new 월드화면(game);
      await 월드.누르기('Skill2Button');
      await game.waitFor('/WorldRoot/HudCanvas/QuickSlots/Skill2Button/CooldownText', { text: '' });
      await verify('월드 화면에서 「대지 가르기」를 누르면 쿨타임 숫자가 보인다', /^\d+$/.test(await 월드.쿨타임글()), true);
    });
    await test.step('월드 화면에서 「PK」를 누른다', async () => {
      const 월드 = new 월드화면(game);
      await 월드.누르기('PkModeButton');
      const [빨강 = 0, 초록 = 0, 파랑 = 0] = await 월드.버튼색('PkModeButton');
      await 월드.누르기('PkModeButton');
      await verify('월드 화면에서 「PK」를 누르면 「PK」 버튼이 빨간색으로 바뀐다', 빨강 > 초록 && 빨강 > 파랑, true);
    });
    await test.step('월드 화면에서 「자동」을 누른다', async () => {
      const 월드 = new 월드화면(game);
      const 앞 = JSON.stringify(await 월드.버튼색('AutoHuntButton'));
      await 월드.누르기('AutoHuntButton');
      const 뒤 = JSON.stringify(await 월드.버튼색('AutoHuntButton'));
      await 월드.누르기('AutoHuntButton');
      await verify('월드 화면에서 「자동」을 누르면 「자동」 버튼이 켜진 색으로 바뀐다', 뒤 !== 앞, true);
    });
    await test.step('월드 화면에서 「귀환」을 누른다', async () => {
      const 월드 = new 월드화면(game);
      await 월드.귀환누르기();
      await 월드.구역글뜰때까지('하늘빛 마을', 20_000);
      await verify('월드 화면에서 「귀환」을 누르면 구역 이름이 「하늘빛 마을」로 바뀐다', await 월드.구역글(), '하늘빛 마을');
    });
    await test.step('월드 화면에서 「강타」 버튼을 확인한다', async () => {
      await verify('월드 화면에 「강타」 버튼이 보이고 누를 수 있다', (await new 월드화면(game).버튼('Skill1Button'))?.interactable, true);
    });
    await test.step('월드 화면에서 「공격」 버튼을 확인한다', async () => {
      await verify('월드 화면에 「공격」 버튼이 보이고 누를 수 있다', (await new 월드화면(game).버튼('AttackButton'))?.interactable, true);
    });
    await test.step('월드 화면에서 「나가기」를 누른다', async () => {
      await new 월드화면(game).나가기누르기();
      await game.waitFor(캐릭터선택화면.창, { timeoutMs: 15_000 });
      await verify('월드 화면에서 「나가기」를 누르면 캐릭터 선택 화면으로 간다', (await game.find(캐릭터선택화면.창)) !== null, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
