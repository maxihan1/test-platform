import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 성향주기, 순간이동, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { HP가줄때까지 } from './helpers/loot.helper.js';
import { 캐릭터선택화면 } from './pages/character-select.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-247',
  name: '악명 캐릭터가 마을에 있으면 경비병에게 맞아 HP 가 최대보다 줄어든다',
  platforms: ['android'],
  precondition: ['성향치 −100 인 새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'npc:경비병', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 월드: 월드화면 | undefined;
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('성향치 −100 인 새 전사 캐릭터를 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn247');
      누구 = 나;
      await 성향주기(admin, 나, -100);
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      월드 = await 게임입장(game, 누구!);
    });
    await test.step('게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드!.구역글(), '하늘빛 마을', { blocker: true });
      await verify('캐릭터의 성향치가 −100 이다', (await 캐릭터읽기(admin, 누구!)).alignment.value, -100, { blocker: true });
    });
    await test.step('경비병 곁으로 옮겨 다시 들어간다', async () => {
      const 경비병 = await 월드!.자리('Npc_npc_guard_w');
      await 월드!.나가기누르기();
      const 선택 = await 캐릭터선택화면.열기(game);
      await 순간이동(admin, 누구!, { x: 경비병.x + 3, z: 경비병.z });
      await 선택.칸뜰때까지(누구!.이름);
      await 선택.게임시작누르기(누구!.이름);
      월드 = await 월드화면.열기(game);
      await verify('다시 들어와도 하늘빛 마을에 있다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('마을에서 경비병이 다가오기를 기다린다', async () => {
      const 체력 = await HP가줄때까지(월드!, 50_000);
      await verify('악명 캐릭터가 마을에 있으면 경비병에게 맞아 HP 가 최대보다 줄어든다', 체력.현재 < 체력.최대, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
