import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';
import { PK빈안내 } from './pages/pk-empty.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-233',
  name: '캐릭터 정보 창에서 「PK 기록」을 누르면 「PK 기록이 없습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['PK 기록이 없는 새 전사 캐릭터로 게임에 들어와 캐릭터 정보 창을 열었다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui233');
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 캐릭터 정보 창을 연다', async () => {
      await 게임입장(game, 누구!);
      const 창 = await 캐릭터정보창.열기(game);
      await verify('캐릭터 정보 창이 보인다', await 창.떠있나(), true, { blocker: true });
    });
    await test.step('캐릭터 정보 창에서 「PK 기록」을 누른다', async () => {
      const 창 = new 캐릭터정보창(game);
      await 창.탭누르기('PkTab');
      const 안내 = new PK빈안내(game);
      await 안내.뜰때까지();
      await verify('캐릭터 정보 창에서 「PK 기록」을 누르면 「PK 기록이 없습니다.」가 보인다', await 안내.글(), 'PK 기록이 없습니다.');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
