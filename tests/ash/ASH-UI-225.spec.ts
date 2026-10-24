import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터선택화면 } from './pages/character-select.page.js';
import { 새캐릭터창 } from './pages/character-create.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-225',
  name: '캐릭터 선택 화면에서 「+ 새 캐릭터」를 누르면 새 캐릭터 만들기 창이 뜬다',
  platforms: ['android'],
  precondition: ['새 계정으로 로그인해 캐릭터 선택 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 계정과 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui225');
    });
    await test.step('새 계정으로 로그인해 캐릭터 선택 화면을 연다', async () => {
      const 선택 = await 로그인하기(game, 누구!);
      await 선택.칸뜰때까지(누구!.이름);
      await verify('캐릭터 선택 화면에 새 캐릭터 칸이 보인다', await 선택.칸찾기(누구!.이름), 0, { blocker: true });
      const 배치 = await game.layout('/Boot/BootCanvas/CharacterSelectView');
      await verify('캐릭터 선택 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('캐릭터 선택 화면에서 「+ 새 캐릭터」를 누른다', async () => {
      const 선택 = new 캐릭터선택화면(game);
      await 선택.새캐릭터누르기(1);
      await game.waitFor(새캐릭터창.창);
      const 창 = new 새캐릭터창(game);
      const 떴다 = await 창.떠있나();
      await 창.취소누르기();
      await verify('캐릭터 선택 화면에서 「+ 새 캐릭터」를 누르면 새 캐릭터 만들기 창이 뜬다', 떴다, true);
    });
    await test.step('캐릭터 선택 화면에서 「삭제」를 누른다', async () => {
      const 선택 = new 캐릭터선택화면(game);
      await 선택.삭제누르기(누구!.이름);
      await game.waitFor('/Boot/BootCanvas/CharacterSelectView/ConfirmDialog');
      const 떴다 = await 선택.삭제확인창떠있나();
      await 선택.삭제취소누르기();
      await verify('캐릭터 선택 화면에서 「삭제」를 누르면 삭제 확인 창이 뜬다', 떴다, true);
    });
    await test.step('캐릭터 선택 화면에서 「게임 시작」을 누른다', async () => {
      await new 캐릭터선택화면(game).게임시작누르기(누구!.이름);
      const 월드 = await 월드화면.열기(game);
      await verify('캐릭터 선택 화면에서 「게임 시작」을 누르면 월드 화면으로 간다', await 월드.있나('/WorldRoot/HudCanvas/StatusPanel/GoldText'), true);
    });
    await test.step('캐릭터 선택 화면에서 「로그아웃」을 누른다', async () => {
      await new 월드화면(game).나가기누르기();
      const 선택 = await 캐릭터선택화면.열기(game);
      await 선택.로그아웃누르기();
      await game.waitFor(로그인화면.창, { timeoutMs: 15_000 });
      await verify('캐릭터 선택 화면에서 「로그아웃」을 누르면 로그인 화면으로 간다', (await game.find(로그인화면.창)) !== null, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
