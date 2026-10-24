import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-220',
  name: '캐릭터 정보 창에서 「PK 기록」을 누르면 PK 요약 줄이 보인다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui220');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('캐릭터 정보 창을 연다', async () => {
      const 창 = await 캐릭터정보창.열기(game);
      await verify('캐릭터 정보 창이 보인다', await 창.떠있나(), true, { blocker: true });
      const 배치 = await game.layout('/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel');
      await verify('캐릭터 정보 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
    await test.step('캐릭터 정보 창에서 「PK 기록」을 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.탭누르기('PkTab');
      await 창.줄뜰때까지('PkSummary');
      await verify('캐릭터 정보 창에서 「PK 기록」을 누르면 PK 요약 줄이 보인다', await 창.PK요약있나(), true);
    });
    await test.step('캐릭터 정보 창에서 「골드 내역」을 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.탭누르기('LedgerTab');
      await 창.줄뜰때까지('LedgerEntry');
      await verify('캐릭터 정보 창에서 「골드 내역」을 누르면 골드 내역 줄이 보인다', await 창.원장줄있나(), true);
    });
    await test.step('캐릭터 정보 창에서 「정보」를 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.탭누르기('StatsTab');
      await 창.줄뜰때까지('NameLine');
      await verify('캐릭터 정보 창에서 「정보」를 누르면 이름 줄이 보인다', (await 창.줄글('NameLine')).startsWith(누구!.이름), true);
    });
    await test.step('캐릭터 정보 창에서 「닫기」를 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.닫기누르기();
      await game.waitFor(캐릭터정보창.창, { gone: true });
      await verify('캐릭터 정보 창에서 「닫기」를 누르면 창이 닫힌다', await 창.떠있나(), false);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
