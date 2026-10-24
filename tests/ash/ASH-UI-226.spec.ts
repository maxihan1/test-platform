import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 새캐릭터창 } from './pages/character-create.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-226',
  name: '새 캐릭터 만들기 창에서 「궁수」를 누르면 직업 설명이 궁수 설명으로 바뀐다',
  platforms: ['android'],
  precondition: ['새 계정으로 로그인해 새 캐릭터 만들기 창을 열었다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      누구 = await 새계정(admin, 'qaui226');
    });
    await test.step('새 계정으로 로그인해 새 캐릭터 만들기 창을 연다', async () => {
      await 로그인하기(game, 누구!);
      const 창 = await 새캐릭터창.열기(game, 0);
      await verify('새 캐릭터 만들기 창이 보인다', await 창.떠있나(), true, { blocker: true });
      const 배치 = await game.layout('/Boot/BootCanvas/CharacterSelectView/CharacterCreatePanel');
      await verify('새 캐릭터 만들기 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('새 캐릭터 만들기 창에서 「궁수」를 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      await 창.직업누르기('Archer');
      await verify('새 캐릭터 만들기 창에서 「궁수」를 누르면 직업 설명이 궁수 설명으로 바뀐다', await 창.직업설명(), '먼 거리에서 화살로 공격합니다. 스킬: 조준 사격, 화살비');
    });
    await test.step('새 캐릭터 만들기 창에서 「마법사」를 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      await 창.직업누르기('Mage');
      await verify('새 캐릭터 만들기 창에서 「마법사」를 누르면 직업 설명이 마법사 설명으로 바뀐다', await 창.직업설명(), '강력한 마법과 회복 마법을 씁니다. 스킬: 화염구, 회복');
    });
    await test.step('새 캐릭터 만들기 창에서 「전사」를 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      await 창.직업누르기('Warrior');
      await verify('새 캐릭터 만들기 창에서 「전사」를 누르면 직업 설명이 전사 설명으로 바뀐다', await 창.직업설명(), '튼튼한 근접 전투 직업입니다. 스킬: 강타, 대지 가르기');
    });
    await test.step('새 캐릭터 만들기 창에서 「여성」을 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      await 창.성별누르기('Female');
      await verify('새 캐릭터 만들기 창에서 「여성」을 누르면 「여성」 버튼이 고른 색으로 바뀐다', JSON.stringify(await 창.성별색('Female')) !== JSON.stringify(await 창.성별색('Male')), true);
    });
    await test.step('새 캐릭터 만들기 창에서 「남성」을 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      const 앞 = JSON.stringify(await 창.성별색('Male'));
      await 창.성별누르기('Male');
      await verify('새 캐릭터 만들기 창에서 「남성」을 누르면 「남성」 버튼이 고른 색으로 바뀐다', JSON.stringify(await 창.성별색('Male')) !== 앞, true);
    });
    await test.step('새 캐릭터 만들기 창에서 「만들기」 버튼을 확인한다', async () => {
      await verify('새 캐릭터 만들기 창에 「만들기」 버튼이 보이고 누를 수 있다', (await new 새캐릭터창(game).만들기버튼())?.interactable, true);
    });
    await test.step('새 캐릭터 만들기 창에서 「취소」를 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      await 창.취소누르기();
      await game.waitFor(새캐릭터창.창, { gone: true });
      await verify('새 캐릭터 만들기 창에서 「취소」를 누르면 창이 닫힌다', await 창.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 계정지우기(admin, 누구.아이디);
  }
});
