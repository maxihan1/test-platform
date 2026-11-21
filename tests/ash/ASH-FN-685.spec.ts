import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 캐릭터정보창 } from './pages/character-info.page.js';
import { 골드내역줄 } from './pages/gold-ledger.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-685',
  name: '새 캐릭터로 「골드 내역」을 누르면 캐릭터 생성 줄의 사유가 「캐릭터 생성」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn685');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('캐릭터 정보 창에서 「골드 내역」을 누른다', async () => {
      const 창 = await 캐릭터정보창.열기(game);
      await 창.탭누르기('LedgerTab');
      const 내역 = new 골드내역줄(game);
      await 내역.뜰때까지(0);
      await verify('새 캐릭터로 「골드 내역」을 누르면 캐릭터 생성 줄의 사유가 「캐릭터 생성」이다', (await 내역.칸(0)).사유, '캐릭터 생성');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
