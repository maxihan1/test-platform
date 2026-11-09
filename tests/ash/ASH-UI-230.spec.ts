import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터선택화면 } from './pages/character-select.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-230',
  name: '캐릭터 선택 화면에서 「삭제」를 누르면 삭제 확인 창이 뜬다',
  platforms: ['android'],
  precondition: ['새 계정으로 로그인해 캐릭터 선택 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 계정과 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui230');
    });
    await test.step('새 계정으로 로그인해 캐릭터 선택 화면을 연다', async () => {
      const 선택 = await 로그인하기(game, 누구!);
      await 선택.칸뜰때까지(누구!.이름);
      await verify('캐릭터 선택 화면에 새 캐릭터 칸이 보인다', await 선택.칸찾기(누구!.이름), 0, { blocker: true });
    });
    await test.step('캐릭터 선택 화면에서 「삭제」를 누른다', async () => {
      const 선택 = new 캐릭터선택화면(game);
      await 선택.삭제누르기(누구!.이름);
      await game.waitFor(`${캐릭터선택화면.창}/ConfirmDialog`);
      await verify('캐릭터 선택 화면에서 「삭제」를 누르면 삭제 확인 창이 뜬다', await 선택.삭제확인창떠있나(), true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
